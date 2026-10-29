import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { OrgDocumentType, Role } from "@prisma/client";
import { getPrivateStorage } from "@/lib/adapters/storage";
import { db } from "@/lib/db";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
// Admin document links work for 5 minutes.
export const DOCUMENT_LINK_TTL_MS = 5 * 60_000;

// Allowed types, identified by their first bytes, not by the browser's claim.
const FILE_SIGNATURES: { contentType: string; ext: string; magic: number[] }[] = [
  { contentType: "application/pdf", ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { contentType: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { contentType: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
];

export function detectFileType(bytes: Uint8Array) {
  return FILE_SIGNATURES.find((s) => s.magic.every((b, i) => bytes[i] === b)) ?? null;
}

export type DocumentFileError = "missing" | "too_large" | "wrong_type";

export function validateDocumentFile(bytes: Uint8Array): { ok: true; contentType: string; ext: string } | { ok: false; error: DocumentFileError } {
  if (bytes.length === 0) return { ok: false, error: "missing" };
  if (bytes.length > MAX_DOCUMENT_BYTES) return { ok: false, error: "too_large" };
  const type = detectFileType(bytes);
  if (!type) return { ok: false, error: "wrong_type" };
  return { ok: true, contentType: type.contentType, ext: type.ext };
}

// Stores the file privately and records it; replaces an earlier file of the same type.
export async function storeOrgDocument(orgId: string, type: OrgDocumentType, fileName: string, bytes: Uint8Array) {
  const check = validateDocumentFile(bytes);
  if (!check.ok) return check;

  const fileKey = `org-docs/${orgId}/${type.toLowerCase()}-${randomBytes(12).toString("hex")}.${check.ext}`;
  const storage = getPrivateStorage();
  await storage.put(fileKey, bytes, check.contentType);

  const previous = await db.orgDocument.findUnique({ where: { orgId_type: { orgId, type } } });
  const doc = await db.orgDocument.upsert({
    where: { orgId_type: { orgId, type } },
    create: { orgId, type, fileKey, fileName: cleanFileName(fileName), contentType: check.contentType, sizeBytes: bytes.length },
    update: { fileKey, fileName: cleanFileName(fileName), contentType: check.contentType, sizeBytes: bytes.length, uploadedAt: new Date() },
  });
  if (previous) await storage.delete(previous.fileKey);
  return { ok: true as const, document: doc };
}

function cleanFileName(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document";
}

// ---------- Signed, short-lived admin links ----------

function signingSecret() {
  const secret = process.env.STORAGE_SIGNING_SECRET;
  if (!secret || secret === "change-me") throw new Error("STORAGE_SIGNING_SECRET is not set");
  return secret;
}

function signature(documentId: string, expires: number) {
  return createHmac("sha256", signingSecret()).update(`${documentId}:${expires}`).digest("base64url");
}

export function signedDocumentPath(documentId: string, now: Date = new Date()) {
  const expires = now.getTime() + DOCUMENT_LINK_TTL_MS;
  return `/api/documents/${documentId}?expires=${expires}&sig=${signature(documentId, expires)}`;
}

export type DocumentAccess =
  | { ok: true; bytes: Uint8Array; contentType: string; fileName: string }
  | { ok: false; status: 401 | 403 | 404 };

// Both a valid signature AND a signed-in admin are required (PRD 6.8: admin-only access).
export async function authorizeDocumentDownload(params: {
  user: { role: Role } | null;
  documentId: string;
  expires: string | null;
  sig: string | null;
  now?: Date;
}): Promise<DocumentAccess> {
  const { user, documentId, expires, sig, now = new Date() } = params;
  if (!user) return { ok: false, status: 401 };
  if (user.role !== "ADMIN") return { ok: false, status: 403 };

  const expiresAt = Number(expires);
  if (!sig || !Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return { ok: false, status: 403 };
  const expected = Buffer.from(signature(documentId, expiresAt));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, status: 403 };

  const doc = await db.orgDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false, status: 404 };
  const file = await getPrivateStorage().get(doc.fileKey);
  if (!file) return { ok: false, status: 404 };
  return { ok: true, bytes: file.bytes, contentType: file.contentType, fileName: doc.fileName };
}
