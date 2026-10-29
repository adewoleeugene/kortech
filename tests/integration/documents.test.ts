import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LocalDiskStorage, MemoryStorage, setPrivateStorage } from "@/lib/adapters/storage";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import {
  DOCUMENT_LINK_TTL_MS,
  MAX_DOCUMENT_BYTES,
  authorizeDocumentDownload,
  signedDocumentPath,
  storeOrgDocument,
  validateDocumentFile,
} from "@/lib/business/documents";
import { saveOrganisation } from "@/lib/business/organisation";
import { db } from "@/lib/db";
import { seedReferenceData } from "@/prisma/seed-reference";
import { clearAccountData, testPhone } from "../helpers/db";
import { FAKE_PDF_BYTES, JPEG_BYTES, PDF_BYTES, PNG_BYTES } from "../helpers/files";

let storage: MemoryStorage;
let orgId: string;

beforeAll(() => seedReferenceData(db));
beforeEach(async () => {
  await clearAccountData();
  storage = new MemoryStorage();
  setPrivateStorage(storage);
  const user = (await findOrCreateUserByPhone(testPhone()))!;
  const district = await db.district.findUniqueOrThrow({ where: { slug: "bo" } });
  const saved = await saveOrganisation(user.id, {
    type: "LENDER",
    legalName: "Bo Community Bank",
    regNumber: "SL-12345",
    address: "1 Dambara Road, Bo",
    districtId: district.id,
    contactName: "Mariama Bangura",
    phone: "077123456",
    email: "info@example.org",
    sellsAgrochemicals: false,
  });
  if (!saved.ok) throw new Error("setup failed");
  orgId = saved.orgId;
});
afterAll(async () => {
  setPrivateStorage(null);
  await db.$disconnect();
});

function paramsFromPath(path: string) {
  const url = new URL(path, "http://localhost");
  return { documentId: url.pathname.split("/").at(-1)!, expires: url.searchParams.get("expires"), sig: url.searchParams.get("sig") };
}

const admin = { role: "ADMIN" as const };

describe("file validation", () => {
  it("accepts PDF, PNG and JPEG by their content", () => {
    expect(validateDocumentFile(PDF_BYTES)).toMatchObject({ ok: true, contentType: "application/pdf" });
    expect(validateDocumentFile(PNG_BYTES)).toMatchObject({ ok: true, contentType: "image/png" });
    expect(validateDocumentFile(JPEG_BYTES)).toMatchObject({ ok: true, contentType: "image/jpeg" });
  });

  it("refuses other files even if they are named .pdf", () => {
    expect(validateDocumentFile(FAKE_PDF_BYTES)).toEqual({ ok: false, error: "wrong_type" });
  });

  it("refuses empty files and files over 5 MB", () => {
    expect(validateDocumentFile(new Uint8Array())).toEqual({ ok: false, error: "missing" });
    const big = new Uint8Array(MAX_DOCUMENT_BYTES + 1);
    big.set(PDF_BYTES);
    expect(validateDocumentFile(big)).toEqual({ ok: false, error: "too_large" });
  });
});

describe("storing documents", () => {
  it("stores the file privately and replaces an older file of the same type", async () => {
    const first = await storeOrgDocument(orgId, "LICENCE", "licence v1.pdf", PDF_BYTES);
    const second = await storeOrgDocument(orgId, "LICENCE", "licence v2.png", PNG_BYTES);
    if (!first.ok || !second.ok) throw new Error("upload failed");

    expect(await db.orgDocument.count({ where: { orgId } })).toBe(1);
    expect(storage.files.has(first.document.fileKey)).toBe(false);
    expect(storage.files.get(second.document.fileKey)?.contentType).toBe("image/png");
    expect(second.document.fileKey).toMatch(new RegExp(`^org-docs/${orgId}/licence-[0-9a-f]{24}\\.png$`));
  });

  it("does not store refused files", async () => {
    expect(await storeOrgDocument(orgId, "LICENCE", "x.pdf", FAKE_PDF_BYTES)).toEqual({ ok: false, error: "wrong_type" });
    expect(storage.files.size).toBe(0);
    expect(await db.orgDocument.count()).toBe(0);
  });
});

describe("documents are not publicly accessible", () => {
  async function uploaded() {
    const result = await storeOrgDocument(orgId, "REGISTRATION_CERTIFICATE", "cert.pdf", PDF_BYTES);
    if (!result.ok) throw new Error("upload failed");
    return result.document;
  }

  it("an admin with a valid link can open the document", async () => {
    const doc = await uploaded();
    const access = await authorizeDocumentDownload({ user: admin, ...paramsFromPath(signedDocumentPath(doc.id)) });
    expect(access).toMatchObject({ ok: true, contentType: "application/pdf", fileName: "cert.pdf" });
  });

  it("signed-out visitors get 401, even with a valid link", async () => {
    const doc = await uploaded();
    expect(await authorizeDocumentDownload({ user: null, ...paramsFromPath(signedDocumentPath(doc.id)) })).toEqual({ ok: false, status: 401 });
  });

  it.each(["FARMER", "SUPPLIER", "BUYER", "LENDER", "AGRONOMIST"] as const)("%s accounts get 403, even with a valid link", async (role) => {
    const doc = await uploaded();
    expect(await authorizeDocumentDownload({ user: { role }, ...paramsFromPath(signedDocumentPath(doc.id)) })).toEqual({ ok: false, status: 403 });
  });

  it("links expire after 5 minutes", async () => {
    const doc = await uploaded();
    const issued = new Date("2026-11-02T10:00:00Z");
    const params = paramsFromPath(signedDocumentPath(doc.id, issued));
    expect((await authorizeDocumentDownload({ user: admin, ...params, now: new Date(issued.getTime() + DOCUMENT_LINK_TTL_MS - 1) })).ok).toBe(true);
    expect(await authorizeDocumentDownload({ user: admin, ...params, now: new Date(issued.getTime() + DOCUMENT_LINK_TTL_MS) })).toEqual({ ok: false, status: 403 });
  });

  it("tampered or missing signatures are refused", async () => {
    const doc = await uploaded();
    const params = paramsFromPath(signedDocumentPath(doc.id));
    expect(await authorizeDocumentDownload({ user: admin, ...params, sig: null })).toEqual({ ok: false, status: 403 });
    expect(await authorizeDocumentDownload({ user: admin, ...params, expires: String(Number(params.expires) + 60_000) })).toEqual({ ok: false, status: 403 });
    // A link for one document can't be reused for another.
    const other = await storeOrgDocument(orgId, "LICENCE", "lic.pdf", PDF_BYTES);
    if (!other.ok) throw new Error("upload failed");
    expect(await authorizeDocumentDownload({ user: admin, ...params, documentId: other.document.id })).toEqual({ ok: false, status: 403 });
  });
});

describe("local disk storage", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "smartfarm-storage-"));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("round-trips files and refuses path traversal", async () => {
    const disk = new LocalDiskStorage(dir);
    await disk.put("org-docs/abc/cert.pdf", PDF_BYTES, "application/pdf");
    expect(await disk.get("org-docs/abc/cert.pdf")).toEqual({ bytes: PDF_BYTES, contentType: "application/pdf" });
    await expect(disk.put("../escape.pdf", PDF_BYTES, "application/pdf")).rejects.toThrow("Invalid storage key");
    await expect(disk.put("org-docs/../../escape.pdf", PDF_BYTES, "application/pdf")).rejects.toThrow("Invalid storage key");
    await disk.delete("org-docs/abc/cert.pdf");
    expect(await disk.get("org-docs/abc/cert.pdf")).toBeNull();
    expect(await readdir(join(dir, "org-docs/abc"))).toEqual([]);
  });
});
