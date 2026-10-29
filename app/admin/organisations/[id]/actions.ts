"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifier } from "@/lib/auth/admin";
import { approveOrganisation, rejectOrganisation } from "@/lib/business/organisation";
import { getTranslator } from "@/lib/i18n/server";

export type DecisionState = { error?: string };

const idSchema = z.string().min(1).max(50);

export async function approveAction(orgId: string): Promise<DecisionState> {
  const admin = await requireVerifier();
  const { t } = await getTranslator();
  const result = await approveOrganisation(admin.id, idSchema.parse(orgId));
  if (!result.ok) return { error: t("admin.errorNotPending") };
  revalidatePath(`/admin/organisations/${orgId}`);
  return {};
}

export async function rejectAction(orgId: string, _prev: DecisionState, formData: FormData): Promise<DecisionState> {
  const admin = await requireVerifier();
  const { t } = await getTranslator();
  const result = await rejectOrganisation(admin.id, idSchema.parse(orgId), String(formData.get("reason") ?? ""));
  if (!result.ok) return { error: result.error === "invalid_reason" ? t("admin.errorReason") : t("admin.errorNotPending") };
  revalidatePath(`/admin/organisations/${orgId}`);
  return {};
}
