"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { askQuestion, dailyQuestionLimit, rateAnswer, reportAnswer } from "@/lib/ai/assistant";
import { requireArea } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";

export type AskState = { error?: string };

const askSchema = z.object({ question: z.string().max(2000), conversationId: z.string().max(50).optional() });

function conversationPath(conversationId: string) {
  return `/farmer/assistant?c=${encodeURIComponent(conversationId)}`;
}

export async function askAction(_prev: AskState, formData: FormData): Promise<AskState> {
  const user = await requireArea("farmer");
  const { t } = await getTranslator();
  const input = askSchema.safeParse({
    question: formData.get("question") ?? "",
    conversationId: formData.get("conversationId") || undefined,
  });
  if (!input.success) return { error: t("assistant.errorInvalid") };

  const result = await askQuestion(user.id, input.data);
  if (!result.ok) {
    switch (result.error) {
      case "invalid_question":
        return { error: t("assistant.errorInvalid") };
      case "daily_limit":
        return { error: t("assistant.errorDailyLimit", { limit: dailyQuestionLimit() }) };
      case "too_fast":
        return { error: t("assistant.errorTooFast") };
      case "not_found":
        redirect("/farmer/assistant");
      default:
        return { error: t("assistant.errorUnavailable") };
    }
  }
  redirect(`${conversationPath(result.conversationId)}#a-${result.answer.id}`);
}

const feedbackSchema = z.object({
  messageId: z.string().min(1).max(50),
  conversationId: z.string().min(1).max(50),
  rating: z.enum(["1", "-1"]).optional(),
  note: z.string().max(500).optional(),
});

export async function rateAction(formData: FormData) {
  const user = await requireArea("farmer");
  const { messageId, conversationId, rating } = feedbackSchema.parse(Object.fromEntries(formData));
  if (rating) await rateAnswer(user.id, messageId, rating === "1" ? 1 : -1);
  revalidatePath("/farmer/assistant");
  redirect(`${conversationPath(conversationId)}#a-${messageId}`);
}

export async function reportAction(formData: FormData) {
  const user = await requireArea("farmer");
  const { messageId, conversationId, note } = feedbackSchema.parse(Object.fromEntries(formData));
  await reportAnswer(user.id, messageId, note);
  revalidatePath("/farmer/assistant");
  redirect(`${conversationPath(conversationId)}#a-${messageId}`);
}
