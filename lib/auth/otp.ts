import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getSmsProvider } from "@/lib/adapters/sms";
import { db } from "@/lib/db";
import { RATE_LIMITS, consumeRateLimit } from "@/lib/rate-limit";

// PRD 6.1: 6 digits, valid 5 minutes, max 5 attempts.
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

function otpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret === "change-me") throw new Error("OTP_SECRET is not set");
  return secret;
}

export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", otpSecret()).update(`${phone}:${code}`).digest("hex");
}

export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export type RequestOtpResult =
  // demoCode is set only in demo mode, so the code can be shown on screen.
  | { ok: true; expiresAt: Date; demoCode?: string }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

// `phone` must already be E.164 (see lib/phone.ts).
export async function requestOtp(phone: string, ip: string, now: Date = new Date()): Promise<RequestOtpResult> {
  for (const [key, rule] of [
    [`otp:req:phone:${phone}`, RATE_LIMITS.otpRequestPerPhone],
    [`otp:req:ip:${ip}`, RATE_LIMITS.otpRequestPerIp],
  ] as const) {
    const limit = await consumeRateLimit(key, rule, now);
    if (!limit.allowed) return { ok: false, reason: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds };
  }

  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  // A new code replaces any earlier unused one, so only the latest SMS works.
  await db.$transaction([
    db.otpCode.deleteMany({ where: { phone, consumedAt: null } }),
    db.otpCode.create({ data: { phone, codeHash: hashOtp(phone, code), expiresAt, createdAt: now } }),
  ]);

  await getSmsProvider().send(phone, `Your Kortech code is ${code}. It expires in 5 minutes. Do not share it.`);
  return { ok: true, expiresAt, ...(process.env.DEMO_MODE === "true" && { demoCode: code }) };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" | "rate_limited"; attemptsLeft?: number };

export async function verifyOtp(phone: string, code: string, ip: string, now: Date = new Date()): Promise<VerifyOtpResult> {
  const limit = await consumeRateLimit(`otp:verify:ip:${ip}`, RATE_LIMITS.otpVerifyPerIp, now);
  if (!limit.allowed) return { ok: false, reason: "rate_limited" };

  const otp = await db.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt <= now) return { ok: false, reason: "expired" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashOtp(phone, code), "hex");
  if (!timingSafeEqual(expected, actual)) {
    const { attempts } = await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    if (attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
    return { ok: false, reason: "invalid", attemptsLeft: OTP_MAX_ATTEMPTS - attempts };
  }

  // Conditional update so the same code can't be used twice in a race.
  const consumed = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: now },
  });
  return consumed.count === 1 ? { ok: true } : { ok: false, reason: "expired" };
}
