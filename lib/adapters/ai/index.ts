import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/observability/logger";

// The assistant talks to an AI model only through this interface (PRD 11).
export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AiAnswer =
  | { ok: true; text: string; model: string; truncated: boolean }
  | { ok: false; reason: "refusal" | "unavailable"; model: string };

export interface AiProvider {
  readonly name: string;
  answer(params: { system: string; messages: ChatTurn[] }): Promise<AiAnswer>;
}

// ---------- Claude (Anthropic API) ----------

export class ClaudeProvider implements AiProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(
    private readonly model = process.env.AI_MODEL || "claude-haiku-5-5",
    client?: Anthropic,
  ) {
    // Farmers are waiting on a slow connection: fail fast and show a friendly message instead.
    this.client = client ?? new Anthropic({ timeout: 30_000, maxRetries: 1 });
  }

  async answer({ system, messages }: { system: string; messages: ChatTurn[] }): Promise<AiAnswer> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        // Short practical answers: low effort keeps cost and wait time down.
        output_config: { effort: "low" },
        // The system prompt never changes between requests, so it can be cached.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages,
      });

      if (response.stop_reason === "refusal") {
        logger.warn("ai refusal", { model: response.model, category: response.stop_details?.category ?? null });
        return { ok: false, reason: "refusal", model: response.model };
      }
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("\n")
        .trim();
      if (!text) return { ok: false, reason: "unavailable", model: response.model };
      return { ok: true, text, model: response.model, truncated: response.stop_reason === "max_tokens" };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) logger.warn("ai rate limited", { model: this.model });
      else if (err instanceof Anthropic.AuthenticationError) logger.error("ai authentication failed: check ANTHROPIC_API_KEY", { model: this.model });
      else if (err instanceof Anthropic.BadRequestError) logger.error("ai bad request", { err, model: this.model });
      else if (err instanceof Anthropic.APIError) logger.error("ai api error", { err, status: err.status, model: this.model });
      else logger.error("ai request failed", { err, model: this.model });
      return { ok: false, reason: "unavailable", model: this.model };
    }
  }
}

// ---------- Mock (tests and local development; no API key needed) ----------

// Default reply cites the first source it was given, so citations can be tested end to end.
// Pass `reply` to answer with fixed text or a custom function (e.g. to test the output safety check).
export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly requests: { system: string; messages: ChatTurn[] }[] = [];

  constructor(private readonly reply?: string | ((lastUserMessage: string) => AiAnswer)) {}

  async answer(params: { system: string; messages: ChatTurn[] }): Promise<AiAnswer> {
    this.requests.push(params);
    const last = params.messages.at(-1)?.content ?? "";
    if (typeof this.reply === "function") return this.reply(last);
    if (typeof this.reply === "string") return { ok: true, text: this.reply, model: "mock", truncated: false };

    const source = last.match(/^\[1\] (.+?):$/m)?.[1];
    const text = source
      ? `Here is what the Kortech guide says [1]:\n\n- Follow the advice in "${source}".\n- Ask your extension officer if the problem is serious.`
      : "I don't have a reviewed Kortech guide on this yet.\n\n- Ask your local extension officer for advice on your farm.";
    return { ok: true, text, model: "mock", truncated: false };
  }
}

let provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (provider) return provider;
  const kind = process.env.AI_PROVIDER ?? "mock";
  if (kind === "mock") provider = new MockAiProvider();
  else if (kind === "anthropic") provider = new ClaudeProvider();
  else throw new Error(`Unknown AI_PROVIDER "${kind}"`);
  return provider;
}

export function setAiProvider(next: AiProvider | null) {
  provider = next;
}
