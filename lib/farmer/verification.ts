import { randomBytes } from "node:crypto";
import type { FarmerPhotoType, FarmerVerificationStatus, Role } from "@prisma/client";
import { getPrivateStorage } from "@/lib/adapters/storage";
import { getSmsProvider } from "@/lib/adapters/sms";
import { writeAudit } from "@/lib/audit";
import { isValidLinkSignature, signLink, validateDocumentFile } from "@/lib/business/documents";
import { rejectionSchema } from "@/lib/business/organisation";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

// Farmer photo evidence: a farm photo, an ID card and a selfie, all required to finish
// onboarding. An admin then approves or rejects the farmer, like business verification.
export const REQUIRED_FARMER_PHOTOS = ["FARM", "ID_CARD", "SELFIE"] as const satisfies readonly FarmerPhotoType[];

// Farmers must upload photos before using the app when they haven't, or were asked to redo them.
export function needsFarmerPhotos(status: FarmerVerificationStatus) {
  return status === "NOT_SUBMITTED" || status === "REJECTED";
}

export type FarmerPhotoError = "missing" | "too_large" | "wrong_type";

// Stores one photo privately; replaces an earlier photo of the same type.
export async function storeFarmerPhoto(userId: string, type: FarmerPhotoType, bytes: Uint8Array) {
  const check = validateDocumentFile(bytes);
  if (!check.ok) return check;
  if (!check.contentType.startsWith("image/")) return { ok: false as const, error: "wrong_type" as const };

  const fileKey = `farmer-photos/${userId}/${type.toLowerCase()}-${randomBytes(12).toString("hex")}.${check.ext}`;
  const storage = getPrivateStorage();
  await storage.put(fileKey, bytes, check.contentType);

  const previous = await db.farmerPhoto.findUnique({ where: { userId_type: { userId, type } } });
  await db.farmerPhoto.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, fileKey, contentType: check.contentType, sizeBytes: bytes.length },
    update: { fileKey, contentType: check.contentType, sizeBytes: bytes.length, uploadedAt: new Date() },
  });
  if (previous) await storage.delete(previous.fileKey);
  return { ok: true as const };
}

export async function missingFarmerPhotos(userId: string): Promise<FarmerPhotoType[]> {
  const photos = await db.farmerPhoto.findMany({ where: { userId }, select: { type: true } });
  const have = new Set(photos.map((p) => p.type));
  return REQUIRED_FARMER_PHOTOS.filter((type) => !have.has(type));
}

// Sends the farmer for review once every required photo is in.
export async function submitFarmerPhotos(userId: string, now: Date = new Date()) {
  const missing = await missingFarmerPhotos(userId);
  if (missing.length) return { ok: false as const, missing };
  await db.$transaction(async (tx) => {
    await tx.farmerProfile.update({
      where: { userId },
      data: { verificationStatus: "PENDING", verificationSubmittedAt: now, rejectionReason: null, verifiedAt: null, verifiedById: null },
    });
    await writeAudit(tx, { actorId: userId, action: "farmer.submitted", entity: "FarmerProfile", entityId: userId });
  });
  return { ok: true as const };
}

// ---------- Admin review ----------

export function listFarmersByStatus(status: FarmerVerificationStatus) {
  return db.farmerProfile.findMany({
    where: { verificationStatus: status },
    orderBy: status === "PENDING" ? { verificationSubmittedAt: "asc" } : { updatedAt: "desc" },
    include: { district: true, user: { select: { name: true, phone: true } } },
    take: 100,
  });
}

export function getFarmerForReview(userId: string) {
  return db.farmerProfile.findUnique({
    where: { userId },
    include: {
      district: true,
      chiefdom: true,
      crops: { orderBy: { name: "asc" } },
      photos: true,
      user: { select: { name: true, phone: true, createdAt: true } },
    },
  });
}

export type FarmerDecisionResult = { ok: true } | { ok: false; error: "not_found" | "not_pending" | "invalid_reason" };

export async function approveFarmer(adminId: string, userId: string, now: Date = new Date()): Promise<FarmerDecisionResult> {
  return decideFarmer(adminId, userId, { verificationStatus: "APPROVED", verifiedAt: now, verifiedById: adminId, rejectionReason: null }, {});
}

export async function rejectFarmer(adminId: string, userId: string, reason: string, now: Date = new Date()): Promise<FarmerDecisionResult> {
  const parsed = rejectionSchema.safeParse({ reason });
  if (!parsed.success) return { ok: false, error: "invalid_reason" };
  return decideFarmer(
    adminId,
    userId,
    { verificationStatus: "REJECTED", verifiedAt: now, verifiedById: adminId, rejectionReason: parsed.data.reason },
    { reason: parsed.data.reason },
  );
}

async function decideFarmer(
  adminId: string,
  userId: string,
  data: { verificationStatus: "APPROVED" | "REJECTED"; verifiedAt: Date; verifiedById: string; rejectionReason: string | null },
  metadata: Record<string, string>,
): Promise<FarmerDecisionResult> {
  const profile = await db.farmerProfile.findUnique({ where: { userId }, include: { user: { select: { phone: true } } } });
  if (!profile) return { ok: false, error: "not_found" };

  const changed = await db.$transaction(async (tx) => {
    const updated = await tx.farmerProfile.updateMany({ where: { userId, verificationStatus: "PENDING" }, data });
    if (!updated.count) return false;
    const action = data.verificationStatus === "APPROVED" ? "farmer.approved" : "farmer.rejected";
    await writeAudit(tx, { actorId: adminId, action, entity: "FarmerProfile", entityId: userId, metadata });
    return true;
  });
  if (!changed) return { ok: false, error: "not_pending" };

  const message =
    data.verificationStatus === "APPROVED"
      ? "Kortech: your farm is now verified. Thank you."
      : `Kortech: we could not verify your farm. Reason: ${data.rejectionReason}. Sign in to send new photos.`;
  try {
    await getSmsProvider().send(profile.user.phone, message);
  } catch (err) {
    // The decision stands even if the SMS fails; the farmer also sees it when they sign in.
    logger.warn("farmer verification sms failed", { err });
  }
  return { ok: true };
}

// ---------- Signed, short-lived admin links ----------

const linkSubject = (photoId: string) => `farmer-photo:${photoId}`;

export function signedFarmerPhotoPath(photoId: string, now: Date = new Date()) {
  const { expires, sig } = signLink(linkSubject(photoId), now);
  return `/api/farmer-photos/${photoId}?expires=${expires}&sig=${sig}`;
}

export type FarmerPhotoAccess = { ok: true; bytes: Uint8Array; contentType: string } | { ok: false; status: 401 | 403 | 404 };

// Both a valid signature AND a signed-in admin are required.
export async function authorizeFarmerPhotoDownload(params: {
  user: { role: Role } | null;
  photoId: string;
  expires: string | null;
  sig: string | null;
}): Promise<FarmerPhotoAccess> {
  const { user, photoId, expires, sig } = params;
  if (!user) return { ok: false, status: 401 };
  if (user.role !== "ADMIN") return { ok: false, status: 403 };
  if (!isValidLinkSignature(linkSubject(photoId), expires, sig)) return { ok: false, status: 403 };

  const photo = await db.farmerPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return { ok: false, status: 404 };
  const file = await getPrivateStorage().get(photo.fileKey);
  if (!file) return { ok: false, status: 404 };
  return { ok: true, bytes: file.bytes, contentType: file.contentType };
}
