"use server";

import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/server";
import { type ProfileFieldError, saveFarmerProfile } from "@/lib/farmer/profile";
import { type TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";

export type OnboardingState = { errors?: Partial<Record<ProfileFieldError, string>> };

const ERROR_KEYS: Record<ProfileFieldError, TranslationKey> = {
  name: "onboarding.errorName",
  districtId: "onboarding.errorDistrict",
  chiefdomId: "onboarding.errorChiefdom",
  cropIds: "onboarding.errorCrops",
  farmSize: "onboarding.errorFarmSize",
  farmSizeUnit: "onboarding.errorFarmSize",
};

export async function saveProfileAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser("/onboarding");
  if (!canAccess(user.role, "farmer")) redirect("/forbidden");

  const result = await saveFarmerProfile(user.id, {
    name: String(formData.get("name") ?? ""),
    districtId: String(formData.get("districtId") ?? ""),
    chiefdomId: String(formData.get("chiefdomId") ?? ""),
    cropIds: formData.getAll("cropIds").map(String),
    farmSize: String(formData.get("farmSize") ?? ""),
    farmSizeUnit: String(formData.get("farmSizeUnit") ?? "ACRE") as "ACRE" | "HECTARE",
  });

  if (!result.ok) {
    const { t } = await getTranslator();
    return { errors: Object.fromEntries(result.fieldErrors.map((f) => [f, t(ERROR_KEYS[f])])) };
  }
  redirect("/farmer");
}
