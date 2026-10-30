import type { OrgDocumentType, OrgStatus, OrgType, Organisation } from "@prisma/client";
import { z } from "zod";
import { getSmsProvider } from "@/lib/adapters/sms";
import { canRegisterBusiness } from "@/lib/auth/access";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import { normalizeSierraLeonePhone } from "@/lib/phone";

// ---------- Registration details ----------

export const organisationSchema = z.object({
  type: z.enum(["SUPPLIER", "BUYER", "LENDER"]),
  legalName: z.string().trim().min(2).max(160),
  regNumber: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(300),
  districtId: z.string().min(1),
  contactName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .transform((v) => normalizeSierraLeonePhone(v))
    .refine((v): v is string => v !== null),
  email: z
    .string()
    .trim()
    .max(160)
    .transform((v) => v || undefined)
    .pipe(z.string().email().optional()),
  sellsAgrochemicals: z.boolean(),
});

export type OrganisationInput = z.input<typeof organisationSchema>;
export type OrganisationField = keyof OrganisationInput;

// Details can only change before submission, or after a rejection.
export function isEditable(status: OrgStatus) {
  return status === "DRAFT" || status === "REJECTED";
}

export function canPublishListings(org: Pick<Organisation, "status">) {
  return org.status === "APPROVED";
}

export function requiredDocuments(org: Pick<Organisation, "type" | "sellsAgrochemicals">): OrgDocumentType[] {
  const needsLicence = org.type === "LENDER" || (org.type === "SUPPLIER" && org.sellsAgrochemicals);
  return needsLicence ? ["REGISTRATION_CERTIFICATE", "LICENCE"] : ["REGISTRATION_CERTIFICATE"];
}

export function getOrganisationForUser(userId: string) {
  return db.organisation.findFirst({
    where: { members: { some: { userId } } },
    include: { documents: true, district: true },
  });
}

export type SaveOrganisationResult =
  | { ok: true; orgId: string }
  | { ok: false; error: "invalid"; fields: OrganisationField[] }
  | { ok: false; error: "farmer_account" | "not_editable" };

// Creates the organisation (and makes the user its owner) or updates the draft.
// The user's role follows the organisation type: one primary role per account (PRD 4).
export async function saveOrganisation(userId: string, input: OrganisationInput): Promise<SaveOrganisationResult> {
  const parsed = organisationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => i.path[0] as OrganisationField))] };
  }
  const data = { ...parsed.data, email: parsed.data.email ?? null };
  if (!(await db.district.findUnique({ where: { id: data.districtId } }))) {
    return { ok: false, error: "invalid", fields: ["districtId"] };
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { farmerProfile: true } });
  if (!canRegisterBusiness(user.role, !!user.farmerProfile)) {
    return { ok: false, error: "farmer_account" };
  }

  const existing = await getOrganisationForUser(userId);
  if (existing && !isEditable(existing.status)) return { ok: false, error: "not_editable" };

  const orgId = await db.$transaction(async (tx) => {
    const org = existing
      ? await tx.organisation.update({ where: { id: existing.id }, data })
      : await tx.organisation.create({ data: { ...data, members: { create: { userId, role: "OWNER" } } } });
    await tx.user.update({ where: { id: userId }, data: { role: data.type } });
    return org.id;
  });
  return { ok: true, orgId };
}

// ---------- Submission ----------

export type SubmitResult = { ok: true } | { ok: false; error: "no_organisation" | "not_editable" | "missing_documents"; missing?: OrgDocumentType[] };

export async function submitForVerification(userId: string, now: Date = new Date()): Promise<SubmitResult> {
  const org = await getOrganisationForUser(userId);
  if (!org) return { ok: false, error: "no_organisation" };
  if (!isEditable(org.status)) return { ok: false, error: "not_editable" };

  const have = new Set(org.documents.map((d) => d.type));
  const missing = requiredDocuments(org).filter((t) => !have.has(t));
  if (missing.length) return { ok: false, error: "missing_documents", missing };

  await db.$transaction(async (tx) => {
    // Conditional update guards against a double submit.
    const updated = await tx.organisation.updateMany({
      where: { id: org.id, status: { in: ["DRAFT", "REJECTED"] } },
      data: { status: "PENDING", submittedAt: now, rejectionReason: null },
    });
    if (updated.count) {
      await writeAudit(tx, { actorId: userId, action: "organisation.submitted", entity: "Organisation", entityId: org.id });
    }
  });
  return { ok: true };
}

// ---------- Admin decisions ----------

export const rejectionSchema = z.object({ reason: z.string().trim().min(10).max(500) });

export type DecisionResult = { ok: true } | { ok: false; error: "not_found" | "not_pending" | "invalid_reason" };

export function listOrganisationsByStatus(status: OrgStatus) {
  return db.organisation.findMany({
    where: { status },
    orderBy: status === "PENDING" ? { submittedAt: "asc" } : { updatedAt: "desc" },
    include: { district: true },
    take: 100,
  });
}

export function getOrganisationForReview(orgId: string) {
  return db.organisation.findUnique({
    where: { id: orgId },
    include: {
      district: true,
      documents: { orderBy: { type: "asc" } },
      verifiedBy: { select: { name: true, phone: true } },
      members: { include: { user: { select: { phone: true, name: true } } } },
    },
  });
}

export async function approveOrganisation(adminId: string, orgId: string, now: Date = new Date()): Promise<DecisionResult> {
  return decide(adminId, orgId, { status: "APPROVED", verifiedAt: now, verifiedById: adminId, rejectionReason: null }, "organisation.approved", {});
}

export async function rejectOrganisation(adminId: string, orgId: string, reason: string, now: Date = new Date()): Promise<DecisionResult> {
  const parsed = rejectionSchema.safeParse({ reason });
  if (!parsed.success) return { ok: false, error: "invalid_reason" };
  return decide(
    adminId,
    orgId,
    { status: "REJECTED", rejectionReason: parsed.data.reason, verifiedAt: now, verifiedById: adminId },
    "organisation.rejected",
    { reason: parsed.data.reason },
  );
}

async function decide(
  adminId: string,
  orgId: string,
  data: { status: "APPROVED" | "REJECTED"; rejectionReason: string | null; verifiedAt: Date; verifiedById: string },
  action: string,
  metadata: Record<string, string>,
): Promise<DecisionResult> {
  const org = await db.organisation.findUnique({ where: { id: orgId } });
  if (!org) return { ok: false, error: "not_found" };

  const changed = await db.$transaction(async (tx) => {
    const updated = await tx.organisation.updateMany({ where: { id: orgId, status: "PENDING" }, data });
    if (!updated.count) return false;
    await writeAudit(tx, { actorId: adminId, action, entity: "Organisation", entityId: orgId, metadata });
    return true;
  });
  if (!changed) return { ok: false, error: "not_pending" };

  await notifyDecision(org.phone, org.legalName, data.status, data.rejectionReason);
  return { ok: true };
}

async function notifyDecision(phone: string, legalName: string, status: "APPROVED" | "REJECTED", reason: string | null) {
  const message =
    status === "APPROVED"
      ? `Kortech: ${legalName} is now verified. You can publish listings.`
      : `Kortech: ${legalName} was not verified. Reason: ${reason}. Sign in to fix and resubmit.`;
  try {
    // SMS limit is 160 characters per part; long reasons span several parts.
    await getSmsProvider().send(phone, message);
  } catch (err) {
    // The decision stands even if the SMS fails; the business also sees it on its dashboard.
    logger.warn("verification sms failed", { err });
  }
}

// ---------- Guard used by every listing write (supplier products, buy requests, loan products) ----------

export type ApprovedOrgResult = { ok: true; org: Organisation } | { ok: false; error: "no_organisation" | "not_approved" };

export async function requireApprovedOrganisation(userId: string, type?: OrgType): Promise<ApprovedOrgResult> {
  const org = await getOrganisationForUser(userId);
  if (!org || (type && org.type !== type)) return { ok: false, error: "no_organisation" };
  if (!canPublishListings(org)) return { ok: false, error: "not_approved" };
  return { ok: true, org };
}
