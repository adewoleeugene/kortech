import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MockSmsProvider, setSmsProvider } from "@/lib/adapters/sms";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, hashOtp, requestOtp, verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { clearAccountData, testPhone } from "../helpers/db";

let sms: MockSmsProvider;
const T0 = new Date("2026-11-01T08:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const MINUTE = 60_000;

function lastCodeSentTo(phone: string): string {
  const message = sms.outbox.filter((m) => m.to === phone).at(-1)?.message ?? "";
  const code = message.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`No code sent to ${phone}`);
  return code;
}

function wrongCode(code: string) {
  return code === "000000" ? "111111" : "000000";
}

beforeEach(async () => {
  await clearAccountData();
  sms = new MockSmsProvider();
  setSmsProvider(sms);
});

afterAll(async () => {
  setSmsProvider(null);
  await db.$disconnect();
});

describe("requestOtp", () => {
  it("sends a 6-digit code by SMS and stores only its hash", async () => {
    const phone = testPhone();
    const result = await requestOtp(phone, "1.1.1.1", T0);
    expect(result).toEqual({ ok: true, expiresAt: at(OTP_TTL_MS) });

    const code = lastCodeSentTo(phone);
    const rows = await db.otpCode.findMany({ where: { phone } });
    expect(rows).toHaveLength(1);
    expect(rows[0].codeHash).toBe(hashOtp(phone, code));
    expect(rows[0].codeHash).not.toContain(code);
  });

  it("replaces an earlier unused code", async () => {
    const phone = testPhone();
    await requestOtp(phone, "1.1.1.1", T0);
    const first = lastCodeSentTo(phone);
    await requestOtp(phone, "1.1.1.1", at(MINUTE));
    const second = lastCodeSentTo(phone);

    expect(await db.otpCode.count({ where: { phone } })).toBe(1);
    if (first !== second) {
      expect(await verifyOtp(phone, first, "1.1.1.1", at(2 * MINUTE))).toMatchObject({ ok: false });
    }
    expect(await verifyOtp(phone, second, "1.1.1.1", at(2 * MINUTE))).toEqual({ ok: true });
  });
});

describe("verifyOtp", () => {
  it("accepts the right code once", async () => {
    const phone = testPhone();
    await requestOtp(phone, "1.1.1.1", T0);
    const code = lastCodeSentTo(phone);
    expect(await verifyOtp(phone, code, "1.1.1.1", at(MINUTE))).toEqual({ ok: true });
    expect(await verifyOtp(phone, code, "1.1.1.1", at(MINUTE))).toEqual({ ok: false, reason: "expired" });
  });

  it("expires codes after 5 minutes", async () => {
    const phone = testPhone();
    await requestOtp(phone, "1.1.1.1", T0);
    const code = lastCodeSentTo(phone);
    expect(await verifyOtp(phone, code, "1.1.1.1", at(OTP_TTL_MS))).toEqual({ ok: false, reason: "expired" });
  });

  it("still accepts a code just before it expires", async () => {
    const phone = testPhone();
    await requestOtp(phone, "1.1.1.1", T0);
    const code = lastCodeSentTo(phone);
    expect(await verifyOtp(phone, code, "1.1.1.1", at(OTP_TTL_MS - 1000))).toEqual({ ok: true });
  });

  it("locks the code after 5 wrong attempts, even if the right code comes next", async () => {
    const phone = testPhone();
    await requestOtp(phone, "1.1.1.1", T0);
    const code = lastCodeSentTo(phone);
    const bad = wrongCode(code);

    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      expect(await verifyOtp(phone, bad, "1.1.1.1", at(MINUTE))).toEqual({
        ok: false,
        reason: "invalid",
        attemptsLeft: OTP_MAX_ATTEMPTS - i,
      });
    }
    expect(await verifyOtp(phone, bad, "1.1.1.1", at(MINUTE))).toEqual({ ok: false, reason: "too_many_attempts" });
    expect(await verifyOtp(phone, code, "1.1.1.1", at(MINUTE))).toEqual({ ok: false, reason: "too_many_attempts" });
  });

  it("a new code after a lockout works", async () => {
    const phone = testPhone();
    await requestOtp(phone, "1.1.1.1", T0);
    const bad = wrongCode(lastCodeSentTo(phone));
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await verifyOtp(phone, bad, "1.1.1.1", at(MINUTE));

    await requestOtp(phone, "1.1.1.1", at(2 * MINUTE));
    expect(await verifyOtp(phone, lastCodeSentTo(phone), "1.1.1.1", at(3 * MINUTE))).toEqual({ ok: true });
  });

  it("rejects a code meant for a different phone", async () => {
    const a = testPhone();
    const b = testPhone();
    await requestOtp(a, "1.1.1.1", T0);
    await requestOtp(b, "1.1.1.1", T0);
    const codeA = lastCodeSentTo(a);
    const codeB = lastCodeSentTo(b);
    if (codeA !== codeB) {
      expect(await verifyOtp(b, codeA, "1.1.1.1", at(MINUTE))).toMatchObject({ ok: false, reason: "invalid" });
    }
  });
});

describe("rate limits", () => {
  it("allows 3 code requests per phone per 15 minutes", async () => {
    const phone = testPhone();
    const { limit, windowMs } = RATE_LIMITS.otpRequestPerPhone;
    for (let i = 0; i < limit; i++) {
      expect((await requestOtp(phone, `10.0.0.${i}`, at(i * MINUTE))).ok).toBe(true);
    }
    const blocked = await requestOtp(phone, "10.0.0.99", at(limit * MINUTE));
    expect(blocked).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(sms.outbox.filter((m) => m.to === phone)).toHaveLength(limit);

    // Once the first request leaves the window, a new one is allowed.
    expect((await requestOtp(phone, "10.0.0.99", at(windowMs + 1))).ok).toBe(true);
  });

  it("tells the user how long to wait", async () => {
    const phone = testPhone();
    for (let i = 0; i < 3; i++) await requestOtp(phone, "1.1.1.1", T0);
    const blocked = await requestOtp(phone, "1.1.1.1", at(5 * MINUTE));
    expect(blocked).toEqual({ ok: false, reason: "rate_limited", retryAfterSeconds: 10 * 60 });
  });

  it("allows 20 code requests per IP per hour across different phones", async () => {
    const { limit } = RATE_LIMITS.otpRequestPerIp;
    for (let i = 0; i < limit; i++) {
      expect((await requestOtp(testPhone(), "9.9.9.9", at(i * 1000))).ok).toBe(true);
    }
    expect(await requestOtp(testPhone(), "9.9.9.9", at(limit * 1000))).toMatchObject({
      ok: false,
      reason: "rate_limited",
    });
    // Another IP is unaffected.
    expect((await requestOtp(testPhone(), "8.8.8.8", at(limit * 1000))).ok).toBe(true);
  });

  it("limits code checks per IP", async () => {
    const phone = testPhone();
    await requestOtp(phone, "7.7.7.7", T0);
    await db.rateLimitHit.createMany({
      data: Array.from({ length: RATE_LIMITS.otpVerifyPerIp.limit }, () => ({ key: "otp:verify:ip:7.7.7.7", createdAt: T0 })),
    });
    expect(await verifyOtp(phone, lastCodeSentTo(phone), "7.7.7.7", at(MINUTE))).toEqual({
      ok: false,
      reason: "rate_limited",
    });
  });
});
