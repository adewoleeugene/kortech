"use server";

import type { FarmerPhotoType } from "@prisma/client";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { REQUIRED_FARMER_PHOTOS, storeFarmerPhoto, submitFarmerPhotos } from "@/lib/farmer/verification";
import { getTranslator } from "@/lib/i18n/server";

export type PhotosState = { errors?: Partial<Record<FarmerPhotoType, string>>; error?: string };

export async function uploadFarmerPhotosAction(_prev: PhotosState, formData: FormData): Promise<PhotosState> {
  const user = await requireUser("/onboarding/photos");
  if (!canAccess(user.role, "farmer")) redirect("/forbidden");
  const profile = await db.farmerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/onboarding");
  const { t } = await getTranslator();

  // Each field is optional on its own: a farmer resubmitting may keep photos already sent.
  const errors: PhotosState["errors"] = {};
  for (const type of REQUIRED_FARMER_PHOTOS) {
    const file = formData.get(type);
    if (!(file instanceof File) || file.size === 0) continue;
    const result = await storeFarmerPhoto(user.id, type, new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) errors[type] = t(result.error === "too_large" ? "photos.errorTooLarge" : "photos.errorWrongType");
  }
  if (Object.keys(errors).length) return { errors };

  const submitted = await submitFarmerPhotos(user.id);
  if (!submitted.ok) {
    return { errors: Object.fromEntries(submitted.missing.map((type) => [type, t("photos.errorMissing")])) };
  }
  redirect("/farmer");
}
