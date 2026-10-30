import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "@/lib/observability/logger";

// All SMS goes through this interface (PRD 6.11). Real providers arrive in Milestone 8.
export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

export type SentSms = { to: string; message: string; sentAt: string };

// Dev/test provider: keeps messages in memory, logs them, and optionally appends
// them to a local file so you (and the e2e tests) can read OTP codes.
export class MockSmsProvider implements SmsProvider {
  readonly outbox: SentSms[] = [];

  constructor(private readonly outboxFile?: string) {}

  async send(to: string, message: string) {
    const sms: SentSms = { to, message, sentAt: new Date().toISOString() };
    this.outbox.push(sms);
    logger.info("mock sms sent", { to, message });
    if (this.outboxFile) {
      mkdirSync(dirname(this.outboxFile), { recursive: true });
      appendFileSync(this.outboxFile, JSON.stringify(sms) + "\n");
    }
  }
}

let provider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (provider) return provider;
  const kind = process.env.SMS_PROVIDER ?? "mock";
  if (kind !== "mock") throw new Error(`Unknown SMS_PROVIDER "${kind}"`);
  // The mock logs codes in plain text, so it must never run in production (demo mode excepted).
  const allowed = process.env.ALLOW_MOCK_SMS === "true" || process.env.DEMO_MODE === "true";
  if (process.env.NODE_ENV === "production" && !allowed) {
    throw new Error("The mock SMS provider is disabled in production. Configure a real SMS_PROVIDER.");
  }
  provider = new MockSmsProvider(process.env.SMS_OUTBOX_FILE || undefined);
  return provider;
}

export function setSmsProvider(next: SmsProvider | null) {
  provider = next;
}
