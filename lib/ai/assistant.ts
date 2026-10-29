import type { AiMessage, Prisma } from "@prisma/client";
import { z } from "zod";
import { type ChatTurn, getAiProvider } from "@/lib/adapters/ai";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { createTranslator, defaultLocale } from "@/lib/i18n";
import { RATE_LIMITS, consumeRateLimit } from "@/lib/rate-limit";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { findGuideSources } from "./retrieval";
import { checkAnswer, checkQuestion } from "./safety";

// PRD 6.3 [DECISION: 20/day]. Counted per Sierra Leone day (GMT, so UTC midnight).
export function dailyQuestionLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 20;
}

// How many earlier messages the model sees, to keep cost and latency down.
const HISTORY_MESSAGES = 6;

export const questionSchema = z.string().trim().min(3).max(500);

export type AnswerSource = { n: number; crop: string; cropSlug: string; section: string };

export type FlagReason = "farmer_report" | "safety" | "low_confidence" | "refusal";

function startOfDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function questionsAskedToday(userId: string, now: Date = new Date()) {
  return db.aiMessage.count({
    where: { role: "USER", createdAt: { gte: startOfDay(now) }, conversation: { userId } },
  });
}

export type AskResult =
  | { ok: true; conversationId: string; answer: AiMessage }
  | { ok: false; error: "invalid_question" | "daily_limit" | "too_fast" | "unavailable" | "not_found" };

export async function askQuestion(
  userId: string,
  input: { question: string; conversationId?: string },
  now: Date = new Date(),
): Promise<AskResult> {
  const parsed = questionSchema.safeParse(input.question);
  if (!parsed.success) return { ok: false, error: "invalid_question" };
  const question = parsed.data;

  if ((await questionsAskedToday(userId, now)) >= dailyQuestionLimit()) return { ok: false, error: "daily_limit" };
  if (!(await consumeRateLimit(`ai:user:${userId}`, RATE_LIMITS.aiPerUserPerMinute, now)).allowed) {
    return { ok: false, error: "too_fast" };
  }

  const conversation = input.conversationId
    ? await db.aiConversation.findFirst({
        where: { id: input.conversationId, userId },
        include: { messages: { orderBy: { createdAt: "desc" }, take: HISTORY_MESSAGES } },
      })
    : null;
  if (input.conversationId && !conversation) return { ok: false, error: "not_found" };

  const t = createTranslator(defaultLocale);
  let answer: { content: string; model: string; sources: AnswerSource[]; flagReason: FlagReason | null };

  const preCheck = checkQuestion(question);
  if (preCheck.blocked) {
    // Never sent to the model. This is the expected, safe behaviour, so it isn't flagged.
    answer = { content: t("assistant.safeChemicalReply", { chemical: preCheck.chemical }), model: "safety-rule", sources: [], flagReason: null };
  } else {
    const profile = await db.farmerProfile.findUnique({
      where: { userId },
      select: { district: { select: { name: true } }, crops: { select: { name: true, slug: true } } },
    });
    const found = await findGuideSources(question, {
      farmerCropSlugs: profile?.crops.map((c) => c.slug),
      includeSamples: process.env.AI_INCLUDE_SAMPLE_GUIDES === "true",
    });
    const sources: AnswerSource[] = found.map((s, i) => ({ n: i + 1, crop: s.crop, cropSlug: s.cropSlug, section: s.section }));

    const history: ChatTurn[] = (conversation?.messages ?? [])
      .slice()
      .reverse()
      .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.correction ?? m.content }));
    const userMessage = buildUserMessage(question, {
      sources: found.map((s, i) => ({ n: i + 1, crop: s.crop, sectionLabel: t(`guides.section_${s.section}`), content: s.content })),
      district: profile?.district.name,
      crops: profile?.crops.map((c) => c.name),
    });

    const reply = await getAiProvider().answer({ system: SYSTEM_PROMPT, messages: [...history, { role: "user", content: userMessage }] });
    if (!reply.ok && reply.reason === "unavailable") return { ok: false, error: "unavailable" };

    if (!reply.ok) {
      answer = { content: t("assistant.refusalReply"), model: reply.model, sources: [], flagReason: "refusal" };
    } else {
      const postCheck = checkAnswer(reply.text);
      if (postCheck.blocked) {
        // The model broke the safety rule: replace the answer and send it for review.
        answer = { content: t("assistant.safeChemicalReply", { chemical: postCheck.chemical }), model: reply.model, sources: [], flagReason: "safety" };
      } else {
        // No reviewed guide behind the answer: send it to the review queue (PRD A4, "low-confidence").
        answer = { content: reply.text, model: reply.model, sources, flagReason: sources.length ? null : "low_confidence" };
      }
    }
  }

  const saved = await db.$transaction(async (tx) => {
    const conv = conversation
      ? await tx.aiConversation.update({ where: { id: conversation.id }, data: { updatedAt: now } })
      : await tx.aiConversation.create({ data: { userId, createdAt: now, updatedAt: now } });
    await tx.aiMessage.create({ data: { conversationId: conv.id, role: "USER", content: question, createdAt: now } });
    const message = await tx.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: "ASSISTANT",
        content: answer.content,
        model: answer.model,
        sources: answer.sources as unknown as Prisma.InputJsonValue,
        flagged: answer.flagReason !== null,
        flagReason: answer.flagReason,
        reviewStatus: answer.flagReason ? "OPEN" : "NONE",
        // A millisecond later, so the answer always sorts after its question.
        createdAt: new Date(now.getTime() + 1),
      },
    });
    return { conversationId: conv.id, message };
  });
  return { ok: true, conversationId: saved.conversationId, answer: saved.message };
}

// ---------- Farmer views and feedback ----------

export function getConversation(userId: string, conversationId?: string) {
  return db.aiConversation.findFirst({
    where: { userId, ...(conversationId ? { id: conversationId } : {}) },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

// Only the farmer who asked can rate or report an answer.
const ownAnswer = (userId: string, messageId: string): Prisma.AiMessageWhereInput => ({
  id: messageId,
  role: "ASSISTANT",
  conversation: { userId },
});

export async function rateAnswer(userId: string, messageId: string, rating: 1 | -1) {
  const updated = await db.aiMessage.updateMany({ where: ownAnswer(userId, messageId), data: { rating } });
  return updated.count === 1;
}

export async function reportAnswer(userId: string, messageId: string, note?: string) {
  const reportNote = note?.trim().slice(0, 500) || null;
  const updated = await db.aiMessage.updateMany({
    where: ownAnswer(userId, messageId),
    data: { flagged: true, flagReason: "farmer_report", reportNote, reviewStatus: "OPEN" },
  });
  return updated.count === 1;
}

// ---------- Review queue (admins and agronomists, PRD A4) ----------

export async function listReviewQueue(status: "OPEN" | "RESOLVED" = "OPEN") {
  const answers = await db.aiMessage.findMany({
    where: { role: "ASSISTANT", reviewStatus: status },
    orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
    take: 100,
    include: { reviewedBy: { select: { name: true, phone: true } } },
  });
  // Pair each answer with the question it answered.
  const questions = await Promise.all(
    answers.map((a) =>
      db.aiMessage.findFirst({
        where: { conversationId: a.conversationId, role: "USER", createdAt: { lte: a.createdAt } },
        orderBy: { createdAt: "desc" },
        select: { content: true },
      }),
    ),
  );
  return answers.map((a, i) => ({ answer: a, question: questions[i]?.content ?? "" }));
}

export const correctionSchema = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .refine((v) => v === null || v.length >= 10);

export async function resolveReview(reviewerId: string, messageId: string, correction: string, now: Date = new Date()) {
  const parsed = correctionSchema.safeParse(correction);
  if (!parsed.success) return { ok: false as const, error: "invalid_correction" as const };
  return db.$transaction(async (tx) => {
    const updated = await tx.aiMessage.updateMany({
      where: { id: messageId, role: "ASSISTANT", reviewStatus: "OPEN" },
      data: { reviewStatus: "RESOLVED", correction: parsed.data, reviewedById: reviewerId, reviewedAt: now },
    });
    if (!updated.count) return { ok: false as const, error: "not_open" as const };
    await writeAudit(tx, {
      actorId: reviewerId,
      action: "ai_answer.reviewed",
      entity: "AiMessage",
      entityId: messageId,
      metadata: { corrected: parsed.data !== null },
    });
    return { ok: true as const };
  });
}
