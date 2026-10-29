import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MockSmsProvider, setSmsProvider } from "@/lib/adapters/sms";
import { MemoryStorage, setPrivateStorage } from "@/lib/adapters/storage";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { storeOrgDocument } from "@/lib/business/documents";
import {
  type OrganisationInput,
  approveOrganisation,
  getOrganisationForUser,
  rejectOrganisation,
  requireApprovedOrganisation,
  requiredDocuments,
  saveOrganisation,
  submitForVerification,
} from "@/lib/business/organisation";
import { db } from "@/lib/db";
import { saveFarmerProfile } from "@/lib/farmer/profile";
import { seedReferenceData } from "@/prisma/seed-reference";
import { clearAccountData, testPhone } from "../helpers/db";
import { PDF_BYTES } from "../helpers/files";

let districtId: string;
let sms: MockSmsProvider;

beforeAll(async () => {
  await seedReferenceData(db);
  districtId = (await db.district.findUniqueOrThrow({ where: { slug: "kenema" } })).id;
});
beforeEach(async () => {
  await clearAccountData();
  sms = new MockSmsProvider();
  setSmsProvider(sms);
  setPrivateStorage(new MemoryStorage());
});
afterAll(async () => {
  setSmsProvider(null);
  setPrivateStorage(null);
  await db.$disconnect();
});

function orgInput(overrides: Partial<OrganisationInput> = {}): OrganisationInput {
  return {
    type: "SUPPLIER",
    legalName: "Kenema Agro Inputs Ltd",
    regNumber: "SL-BR-2024-001",
    address: "12 Hangha Road, Kenema",
    districtId,
    contactName: "Ibrahim Conteh",
    phone: "076 555 111",
    email: "",
    sellsAgrochemicals: false,
    ...overrides,
  };
}

async function newUser() {
  return (await findOrCreateUserByPhone(testPhone()))!;
}

async function newAdmin() {
  const user = await newUser();
  return db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
}

// A supplier with an organisation and all required documents, submitted for review.
async function pendingSupplier(overrides: Partial<OrganisationInput> = {}) {
  const user = await newUser();
  const saved = await saveOrganisation(user.id, orgInput(overrides));
  if (!saved.ok) throw new Error("setup failed");
  const org = (await getOrganisationForUser(user.id))!;
  for (const type of requiredDocuments(org)) await storeOrgDocument(org.id, type, `${type}.pdf`, PDF_BYTES);
  expect(await submitForVerification(user.id)).toEqual({ ok: true });
  return { user, orgId: saved.orgId };
}

describe("registration", () => {
  it("creates the organisation as a draft, makes the user its owner and sets their role", async () => {
    const user = await newUser();
    const result = await saveOrganisation(user.id, orgInput());
    expect(result.ok).toBe(true);

    const org = await getOrganisationForUser(user.id);
    expect(org).toMatchObject({ status: "DRAFT", type: "SUPPLIER", phone: "+23276555111", email: null, plan: "FREE" });
    expect(await db.orgMember.findFirst({ where: { userId: user.id } })).toMatchObject({ role: "OWNER" });
    expect((await db.user.findUnique({ where: { id: user.id } }))?.role).toBe("SUPPLIER");
  });

  it("updates the same draft instead of creating a second organisation", async () => {
    const user = await newUser();
    await saveOrganisation(user.id, orgInput());
    await saveOrganisation(user.id, orgInput({ type: "LENDER", legalName: "Kenema Microfinance" }));
    expect(await db.organisation.count()).toBe(1);
    expect((await db.user.findUnique({ where: { id: user.id } }))?.role).toBe("LENDER");
  });

  it("reports every invalid field", async () => {
    const user = await newUser();
    const result = await saveOrganisation(user.id, orgInput({ legalName: "", phone: "123", email: "not-an-email", districtId: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "invalid") {
      expect(result.fields.sort()).toEqual(["districtId", "email", "legalName", "phone"]);
    }
  });

  it("refuses a phone number that is already a farmer", async () => {
    const user = await newUser();
    const rice = await db.crop.findUniqueOrThrow({ where: { slug: "rice" } });
    await saveFarmerProfile(user.id, { name: "Musa", districtId, cropIds: [rice.id], farmSizeUnit: "ACRE" });
    expect(await saveOrganisation(user.id, orgInput())).toEqual({ ok: false, error: "farmer_account" });
  });

  it("refuses admin accounts", async () => {
    const admin = await newAdmin();
    expect(await saveOrganisation(admin.id, orgInput())).toEqual({ ok: false, error: "farmer_account" });
  });
});

describe("required documents", () => {
  it("needs a licence for lenders and agrochemical suppliers only", () => {
    expect(requiredDocuments({ type: "BUYER", sellsAgrochemicals: false })).toEqual(["REGISTRATION_CERTIFICATE"]);
    expect(requiredDocuments({ type: "SUPPLIER", sellsAgrochemicals: false })).toEqual(["REGISTRATION_CERTIFICATE"]);
    expect(requiredDocuments({ type: "SUPPLIER", sellsAgrochemicals: true })).toEqual(["REGISTRATION_CERTIFICATE", "LICENCE"]);
    expect(requiredDocuments({ type: "LENDER", sellsAgrochemicals: false })).toEqual(["REGISTRATION_CERTIFICATE", "LICENCE"]);
  });
});

describe("submission", () => {
  it("can't be submitted until the required documents are uploaded", async () => {
    const user = await newUser();
    await saveOrganisation(user.id, orgInput({ sellsAgrochemicals: true }));
    expect(await submitForVerification(user.id)).toEqual({
      ok: false,
      error: "missing_documents",
      missing: ["REGISTRATION_CERTIFICATE", "LICENCE"],
    });
  });

  it("moves to PENDING, records the submission, and locks the details", async () => {
    const { user, orgId } = await pendingSupplier();
    const org = await db.organisation.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.status).toBe("PENDING");
    expect(org.submittedAt).not.toBeNull();
    expect(await db.auditLog.findFirst({ where: { entityId: orgId, action: "organisation.submitted" } })).toMatchObject({ actorId: user.id });

    expect(await saveOrganisation(user.id, orgInput({ legalName: "Changed" }))).toEqual({ ok: false, error: "not_editable" });
    expect(await submitForVerification(user.id)).toEqual({ ok: false, error: "not_editable" });
  });
});

describe("admin decisions", () => {
  it("approve: sets APPROVED, who and when, writes the audit log and sends an SMS", async () => {
    const { orgId } = await pendingSupplier();
    const admin = await newAdmin();
    const now = new Date("2026-11-02T10:00:00Z");

    expect(await approveOrganisation(admin.id, orgId, now)).toEqual({ ok: true });
    const org = await db.organisation.findUniqueOrThrow({ where: { id: orgId } });
    expect(org).toMatchObject({ status: "APPROVED", verifiedAt: now, verifiedById: admin.id, rejectionReason: null });

    const log = await db.auditLog.findFirst({ where: { entityId: orgId, action: "organisation.approved" } });
    expect(log).toMatchObject({ actorId: admin.id, entity: "Organisation" });
    expect(sms.outbox.at(-1)).toMatchObject({ to: "+23276555111" });
    expect(sms.outbox.at(-1)?.message).toContain("verified");
  });

  it("reject: needs a reason, stores it, logs it and tells the business", async () => {
    const { orgId } = await pendingSupplier();
    const admin = await newAdmin();

    expect(await rejectOrganisation(admin.id, orgId, "too short")).toEqual({ ok: false, error: "invalid_reason" });
    const reason = "Registration certificate is unreadable. Please upload a clearer scan.";
    expect(await rejectOrganisation(admin.id, orgId, reason)).toEqual({ ok: true });

    expect(await db.organisation.findUniqueOrThrow({ where: { id: orgId } })).toMatchObject({ status: "REJECTED", rejectionReason: reason });
    const log = await db.auditLog.findFirst({ where: { entityId: orgId, action: "organisation.rejected" } });
    expect(log?.metadata).toEqual({ reason });
    expect(sms.outbox.at(-1)?.message).toContain(reason);
  });

  it("a rejected organisation can fix its details and resubmit", async () => {
    const { user, orgId } = await pendingSupplier();
    const admin = await newAdmin();
    await rejectOrganisation(admin.id, orgId, "Registration number does not match the certificate.");

    expect((await saveOrganisation(user.id, orgInput({ regNumber: "SL-BR-2024-002" }))).ok).toBe(true);
    expect(await submitForVerification(user.id)).toEqual({ ok: true });
    expect(await db.organisation.findUniqueOrThrow({ where: { id: orgId } })).toMatchObject({ status: "PENDING", rejectionReason: null });
  });

  it("only PENDING organisations can be decided", async () => {
    const user = await newUser();
    const saved = await saveOrganisation(user.id, orgInput());
    const admin = await newAdmin();
    if (!saved.ok) throw new Error("setup failed");
    expect(await approveOrganisation(admin.id, saved.orgId)).toEqual({ ok: false, error: "not_pending" });
    expect(await approveOrganisation(admin.id, "missing")).toEqual({ ok: false, error: "not_found" });
    expect(await db.auditLog.count({ where: { action: "organisation.approved" } })).toBe(0);
  });

  it("approving twice only counts once", async () => {
    const { orgId } = await pendingSupplier();
    const admin = await newAdmin();
    await approveOrganisation(admin.id, orgId);
    expect(await approveOrganisation(admin.id, orgId)).toEqual({ ok: false, error: "not_pending" });
    expect(await db.auditLog.count({ where: { entityId: orgId, action: "organisation.approved" } })).toBe(1);
  });
});

describe("only approved organisations can create listings", () => {
  it.each(["DRAFT", "PENDING", "REJECTED"] as const)("%s organisations are refused", async (status) => {
    const user = await newUser();
    const saved = await saveOrganisation(user.id, orgInput());
    if (!saved.ok) throw new Error("setup failed");
    await db.organisation.update({ where: { id: saved.orgId }, data: { status } });
    expect(await requireApprovedOrganisation(user.id)).toEqual({ ok: false, error: "not_approved" });
  });

  it("approved organisations are allowed", async () => {
    const { user, orgId } = await pendingSupplier();
    await approveOrganisation((await newAdmin()).id, orgId);
    const result = await requireApprovedOrganisation(user.id, "SUPPLIER");
    expect(result.ok).toBe(true);
  });

  it("users without an organisation, or of the wrong type, are refused", async () => {
    expect(await requireApprovedOrganisation((await newUser()).id)).toEqual({ ok: false, error: "no_organisation" });
    const { user, orgId } = await pendingSupplier();
    await approveOrganisation((await newAdmin()).id, orgId);
    expect(await requireApprovedOrganisation(user.id, "LENDER")).toEqual({ ok: false, error: "no_organisation" });
  });
});
