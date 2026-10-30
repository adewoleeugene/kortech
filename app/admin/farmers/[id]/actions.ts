"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifier } from "@/lib/auth/admin";
import { approveFarmer, rejectFarmer } from "@/lib/farmer/verification";
import { getTranslator } from "@/lib/i18n/server";

export type DecisionState = { error?: string };

const idSchema = z.string().min(1).max(50);

export async function approveFarmerAction(userId: string): Promise<DecisionState> {
  const admin = await requireVerifier();
  const { t } = await getTranslator();
  const result = await approveFarmer(admin.id, idSchema.parse(userId));
  if (!result.ok) return { error: t("admin.errorNotPending") };
  revalidatePath(`/admin/farmers/${userId}`);
  return {};
}

export async function rejectFarmerAction(userId: string, _prev: DecisionState, formData: FormData): Promise<DecisionState> {
  const admin = await requireVerifier();
  const { t } = await getTranslator();
  const result = await rejectFarmer(admin.id, idSchema.parse(userId), String(formData.get("reason") ?? ""));
  if (!result.ok) return { error: result.error === "invalid_reason" ? t("admin.errorReason") : t("admin.errorNotPending") };
  revalidatePath(`/admin/farmers/${userId}`);
  return {};
}
