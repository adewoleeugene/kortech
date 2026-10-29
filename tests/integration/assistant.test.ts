import type Anthropic from "@anthropic-ai/sdk";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ClaudeProvider, MockAiProvider, setAiProvider } from "@/lib/adapters/ai";
import {
  askQuestion,
  getConversation,
  listReviewQueue,
  questionsAskedToday,
  rateAnswer,
  reportAnswer,
  resolveReview,
} from "@/lib/ai/assistant";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { saveFarmerProfile } from "@/lib/farmer/profile";
import { reviewAndPublishGuide, saveGuideSection } from "@/lib/guides/guides";
import { seedDraftGuides } from "@/prisma/seed-guides";
import { seedReferenceData } from "@/prisma/seed-reference";
import { clearAccountData, testPhone } from "../helpers/db";

let mock: MockAiProvider;
let rice: { id: string };
let kenema: { id: string };
const T0 = new Date("2026-11-02T09:00:00Z");
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);

beforeAll(async () => {
  await seedReferenceData(db);
  rice = await db.crop.findUniqueOrThrow({ where: { slug: "rice" } });
  kenema = await db.district.findUniqueOrThrow({ where: { slug: "kenema" } });
});
beforeEach(async () => {
  await db.cropGuide.deleteMany();
  await clearAccountData();
  mock = new MockAiProvider();
  setAiProvider(mock);
  delete process.env.AI_INCLUDE_SAMPLE_GUIDES;
});
afterEach(() => setAiProvider(null));
afterAll(() => db.$disconnect());

async function farmer() {
  const user = (await findOrCreateUserByPhone(testPhone()))!;
  await saveFarmerProfile(user.id, { name: "Musa Kamara", districtId: kenema.id, cropIds: [rice.id], farmSizeUnit: "ACRE" });
  return user;
}

// A reviewed, published Rice > Pests section, as an agronomist would leave it.
async function reviewedRicePests() {
  const editor = (await findOrCreateUserByPhone(testPhone()))!;
  const saved = await saveGuideSection(editor.id, rice.id, "PESTS", "- Stem borers: look for dead hearts and white heads.\n- Remove and destroy affected tillers.");
  if (!saved.ok) throw new Error("setup failed");
  await reviewAndPublishGuide(editor.id, saved.guideId);
}

describe("answers cite relevant guide sections", () => {
  it("sends reviewed guide excerpts to the model, saves the sources, and doesn't flag the answer", async () => {
    await reviewedRicePests();
    const user = await farmer();
    const result = await askQuestion(user.id, { question: "How do I control stem borers in my rice?" }, T0);
    if (!result.ok) throw new Error(result.error);

    expect(result.answer.sources).toEqual([{ n: 1, crop: "Rice", cropSlug: "rice", section: "PESTS" }]);
    expect(result.answer.content).toContain("[1]");
    expect(result.answer).toMatchObject({ flagged: false, reviewStatus: "NONE", model: "mock" });

    const sent = mock.requests[0];
    expect(sent.system).toBe(SYSTEM_PROMPT);
    const userMessage = sent.messages.at(-1)!.content;
    expect(userMessage).toContain("[1] Rice, Pests:\n- Stem borers");
    expect(userMessage).toContain("About the farmer: district: Kenema; crops: Rice.");
    expect(userMessage).toContain("Farmer's question: How do I control stem borers in my rice?");
  });

  it("never uses unreviewed sample guides, unless development allows it", async () => {
    await seedDraftGuides(db, { publishAsSample: true });
    const user = await farmer();
    const without = await askQuestion(user.id, { question: "How do I stop birds eating my rice?" }, T0);
    expect(without.ok && without.answer.sources).toEqual([]);

    process.env.AI_INCLUDE_SAMPLE_GUIDES = "true";
    const withSamples = await askQuestion(user.id, { question: "How do I stop birds eating my rice?" }, minutes(1));
    expect(withSamples.ok && (withSamples.answer.sources as { section: string }[])[0]).toMatchObject({ crop: "Rice", section: "PESTS" });
  });

  it("flags answers with no reviewed guide behind them as low confidence, for review", async () => {
    const user = await farmer();
    const result = await askQuestion(user.id, { question: "Can I grow coffee in Kono?" }, T0);
    expect(result.ok && result.answer).toMatchObject({ sources: [], flagged: true, flagReason: "low_confidence", reviewStatus: "OPEN" });
  });
});

describe("hazardous-chemical safety rule", () => {
  it("answers a dose request for a hazardous pesticide without calling the model", async () => {
    const user = await farmer();
    const result = await askQuestion(user.id, { question: "How much Gramoxone should I mix per knapsack?" }, T0);
    if (!result.ok) throw new Error(result.error);
    expect(mock.requests).toHaveLength(0);
    expect(result.answer.model).toBe("safety-rule");
    expect(result.answer.content).toContain("I can't give doses or mixing rates for paraquat");
    expect(result.answer.content).toContain("extension officer");
    expect(result.answer.content).toContain("label");
    // The safe reply is the expected behaviour, so it doesn't clutter the review queue.
    expect(result.answer.flagged).toBe(false);
  });

  it("replaces a model answer that gives a dose anyway, and sends it for review", async () => {
    setAiProvider(new MockAiProvider("Mix 50 ml of Gramoxone in 15 litres of water and spray the weeds."));
    const user = await farmer();
    const result = await askQuestion(user.id, { question: "How do I clear grass from my farm quickly?" }, T0);
    if (!result.ok) throw new Error(result.error);
    expect(result.answer.content).not.toContain("50 ml");
    expect(result.answer.content).toContain("I can't give doses or mixing rates for paraquat");
    expect(result.answer).toMatchObject({ flagged: true, flagReason: "safety", reviewStatus: "OPEN" });
  });

  it("stores a polite reply and flags it when the model declines", async () => {
    setAiProvider(new MockAiProvider(() => ({ ok: false, reason: "refusal", model: "mock" })));
    const user = await farmer();
    const result = await askQuestion(user.id, { question: "Something the model declines" }, T0);
    expect(result.ok && result.answer).toMatchObject({ flagReason: "refusal", reviewStatus: "OPEN" });
    expect(result.ok && result.answer.content).toContain("I can't help with that question");
  });
});

describe("limits", () => {
  it("allows 20 questions per day, counting only today", async () => {
    const user = await farmer();
    const conv = await db.aiConversation.create({ data: { userId: user.id } });
    const yesterday = new Date("2026-11-01T23:59:00Z");
    await db.aiMessage.createMany({
      data: [
        ...Array.from({ length: 19 }, (_, i) => ({ conversationId: conv.id, role: "USER" as const, content: `q${i}`, createdAt: minutes(-60 + i) })),
        ...Array.from({ length: 5 }, () => ({ conversationId: conv.id, role: "USER" as const, content: "old", createdAt: yesterday })),
      ],
    });
    expect(await questionsAskedToday(user.id, T0)).toBe(19);

    expect((await askQuestion(user.id, { question: "Question number twenty" }, T0)).ok).toBe(true);
    expect(await askQuestion(user.id, { question: "Question twenty-one" }, minutes(5))).toEqual({ ok: false, error: "daily_limit" });
    // A new day resets it.
    expect((await askQuestion(user.id, { question: "Tomorrow's question" }, new Date("2026-11-03T06:00:00Z"))).ok).toBe(true);
  });

  it("stops rapid-fire questions (5 per minute)", async () => {
    const user = await farmer();
    for (let i = 0; i < 5; i++) expect((await askQuestion(user.id, { question: `Quick question ${i}` }, T0)).ok).toBe(true);
    expect(await askQuestion(user.id, { question: "One too many" }, T0)).toEqual({ ok: false, error: "too_fast" });
  });

  it("doesn't save or count a question when the AI is unavailable", async () => {
    setAiProvider(new MockAiProvider(() => ({ ok: false, reason: "unavailable", model: "mock" })));
    const user = await farmer();
    expect(await askQuestion(user.id, { question: "When do I plant rice?" }, T0)).toEqual({ ok: false, error: "unavailable" });
    expect(await questionsAskedToday(user.id, T0)).toBe(0);
  });

  it("rejects empty or very long questions", async () => {
    const user = await farmer();
    expect(await askQuestion(user.id, { question: "  " }, T0)).toEqual({ ok: false, error: "invalid_question" });
    expect(await askQuestion(user.id, { question: "x".repeat(501) }, T0)).toEqual({ ok: false, error: "invalid_question" });
  });
});

describe("conversations", () => {
  it("sends earlier turns as history and keeps the conversation private", async () => {
    const user = await farmer();
    const first = await askQuestion(user.id, { question: "When do I plant rice?" }, T0);
    if (!first.ok) throw new Error(first.error);
    await askQuestion(user.id, { question: "And when do I harvest it?", conversationId: first.conversationId }, minutes(1));

    const second = mock.requests[1].messages;
    expect(second.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(second[0].content).toBe("When do I plant rice?");

    const conversation = await getConversation(user.id, first.conversationId);
    expect(conversation?.messages.map((m) => m.role)).toEqual(["USER", "ASSISTANT", "USER", "ASSISTANT"]);

    const other = await farmer();
    expect(await askQuestion(other.id, { question: "Let me in", conversationId: first.conversationId }, T0)).toEqual({ ok: false, error: "not_found" });
    expect(await getConversation(other.id, first.conversationId)).toBeNull();
  });
});

describe("ratings, reports and the admin review queue", () => {
  it("a farmer can rate and report only their own answers", async () => {
    await reviewedRicePests();
    const user = await farmer();
    const result = await askQuestion(user.id, { question: "How do I control stem borers in rice?" }, T0);
    if (!result.ok) throw new Error(result.error);
    const other = await farmer();

    expect(await rateAnswer(other.id, result.answer.id, 1)).toBe(false);
    expect(await reportAnswer(other.id, result.answer.id)).toBe(false);
    expect(await rateAnswer(user.id, result.answer.id, -1)).toBe(true);
    expect(await reportAnswer(user.id, result.answer.id, "This is not what my extension officer said")).toBe(true);
    expect(await db.aiMessage.findUnique({ where: { id: result.answer.id } })).toMatchObject({
      rating: -1,
      flagged: true,
      flagReason: "farmer_report",
      reportNote: "This is not what my extension officer said",
      reviewStatus: "OPEN",
    });
  });

  it("flagged answers appear in the admin queue with their question, and can be corrected", async () => {
    await reviewedRicePests();
    const user = await farmer();
    const reported = await askQuestion(user.id, { question: "How do I control stem borers in rice?" }, T0);
    const unflagged = await askQuestion(user.id, { question: "What do stem borers look like in rice?" }, minutes(1));
    if (!reported.ok || !unflagged.ok) throw new Error("ask failed");
    await reportAnswer(user.id, reported.answer.id, "Wrong");

    const queue = await listReviewQueue("OPEN");
    expect(queue.map((q) => [q.question, q.answer.id])).toEqual([["How do I control stem borers in rice?", reported.answer.id]]);

    const reviewer = (await findOrCreateUserByPhone(testPhone()))!;
    expect(await resolveReview(reviewer.id, reported.answer.id, "short")).toEqual({ ok: false, error: "invalid_correction" });
    const correction = "Cut and burn stems with dead hearts, and plant early so the crop escapes the worst borer attack.";
    expect(await resolveReview(reviewer.id, reported.answer.id, correction)).toEqual({ ok: true });
    expect(await resolveReview(reviewer.id, reported.answer.id, "")).toEqual({ ok: false, error: "not_open" });

    expect(await listReviewQueue("OPEN")).toEqual([]);
    const done = await listReviewQueue("RESOLVED");
    expect(done[0].answer).toMatchObject({ correction, reviewedById: reviewer.id });
    expect(await db.auditLog.findFirst({ where: { entityId: reported.answer.id } })).toMatchObject({ action: "ai_answer.reviewed", actorId: reviewer.id });

    // The farmer's next question uses the correction as history, not the original answer.
    await askQuestion(user.id, { question: "Thanks. Anything else?", conversationId: reported.conversationId }, minutes(2));
    expect(mock.requests.at(-1)!.messages.map((m) => m.content)).toContain(correction);
  });
});

describe("Claude provider", () => {
  type CreateParams = Anthropic.MessageCreateParamsNonStreaming;

  function fakeClient(response: Partial<Anthropic.Message> | Error) {
    const calls: CreateParams[] = [];
    const client = {
      messages: {
        create: async (params: CreateParams) => {
          calls.push(params);
          if (response instanceof Error) throw response;
          return { model: "claude-haiku-5-5", stop_reason: "end_turn", stop_details: null, content: [], ...response };
        },
      },
    };
    return { client: client as unknown as Anthropic, calls };
  }

  it("calls the configured model with a cached system prompt and low effort", async () => {
    const { client, calls } = fakeClient({ content: [{ type: "text", text: "Plant upland rice in May.", citations: null }] as Anthropic.ContentBlock[] });
    const provider = new ClaudeProvider("claude-haiku-5-5", client);
    const answer = await provider.answer({ system: SYSTEM_PROMPT, messages: [{ role: "user", content: "When to plant rice?" }] });

    expect(answer).toEqual({ ok: true, text: "Plant upland rice in May.", model: "claude-haiku-5-5", truncated: false });
    expect(calls[0]).toMatchObject({
      model: "claude-haiku-5-5",
      output_config: { effort: "low" },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "When to plant rice?" }],
    });
  });

  it("reports refusals and errors without throwing", async () => {
    const refused = new ClaudeProvider("claude-haiku-5-5", fakeClient({ stop_reason: "refusal" }).client);
    expect(await refused.answer({ system: "s", messages: [{ role: "user", content: "q" }] })).toMatchObject({ ok: false, reason: "refusal" });

    const failing = new ClaudeProvider("claude-haiku-5-5", fakeClient(new Error("network down")).client);
    expect(await failing.answer({ system: "s", messages: [{ role: "user", content: "q" }] })).toEqual({ ok: false, reason: "unavailable", model: "claude-haiku-5-5" });
  });
});
