"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArea } from "@/lib/auth/server";
import { GUIDE_SECTIONS, reviewAndPublishGuide, saveGuideSection, unpublishGuide } from "@/lib/guides/guides";
import { getTranslator } from "@/lib/i18n/server";

export type GuideFormState = { error?: string; notice?: string };

const target = z.object({ cropId: z.string().min(1).max(50), cropSlug: z.string().max(50), section: z.enum(GUIDE_SECTIONS) });

function refresh(cropSlug: string) {
  revalidatePath(`/guides/${cropSlug}`);
  revalidatePath("/guides");
  revalidatePath(`/admin/guides/${cropSlug}`, "layout");
}

export async function saveGuideAction(targetInput: z.input<typeof target>, _prev: GuideFormState, formData: FormData): Promise<GuideFormState> {
  const editor = await requireArea("admin");
  const { t } = await getTranslator();
  const { cropId, cropSlug, section } = target.parse(targetInput);
  const result = await saveGuideSection(editor.id, cropId, section, String(formData.get("content") ?? ""));
  if (!result.ok) return { error: t("adminGuides.errorContent") };
  refresh(cropSlug);
  return { notice: t("adminGuides.saved") };
}

const guideAction = z.object({ guideId: z.string().min(1).max(50), cropSlug: z.string().max(50), change: z.enum(["publish", "unpublish"]) });

export async function publishGuideAction(formData: FormData) {
  const editor = await requireArea("admin");
  const { guideId, cropSlug, change } = guideAction.parse(Object.fromEntries(formData));
  if (change === "publish") await reviewAndPublishGuide(editor.id, guideId);
  else await unpublishGuide(editor.id, guideId);
  refresh(cropSlug);
}
