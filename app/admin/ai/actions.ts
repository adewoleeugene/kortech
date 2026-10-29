"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveReview } from "@/lib/ai/assistant";
import { requireArea } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";

export type ReviewState = { error?: string };

export async function resolveReviewAction(messageId: string, _prev: ReviewState, formData: FormData): Promise<ReviewState> {
  // Admins and agronomists both review answers.
  const reviewer = await requireArea("admin");
  const { t } = await getTranslator();
  const result = await resolveReview(reviewer.id, z.string().min(1).max(50).parse(messageId), String(formData.get("correction") ?? ""));
  if (!result.ok) return { error: result.error === "invalid_correction" ? t("adminAi.errorCorrection") : t("admin.errorNotPending") };
  revalidatePath("/admin/ai");
  return {};
}
