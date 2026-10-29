import { db } from "@/lib/db";

export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

// Rate limits from the PRD 6.1 (numbers confirmed for Milestone 2).
export const RATE_LIMITS = {
  otpRequestPerPhone: { limit: 3, windowMs: 15 * 60_000 },
  // Many farmers can share one IP (a cooperative's phone, mobile carrier NAT), so this is configurable.
  otpRequestPerIp: { limit: Number(process.env.RATE_LIMIT_OTP_PER_IP) || 20, windowMs: 60 * 60_000 },
  otpVerifyPerIp: { limit: 50, windowMs: 60 * 60_000 },
  // On top of the daily question limit: stops rapid-fire requests to the AI (PRD 7).
  aiPerUserPerMinute: { limit: 5, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

// Sliding window backed by Postgres, so limits hold across server instances.
// Counts hits in the window; if under the limit, records this hit.
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = new Date(now.getTime() - rule.windowMs);
  const hits = await db.rateLimitHit.findMany({
    where: { key, createdAt: { gt: windowStart } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
    take: rule.limit,
  });
  if (hits.length >= rule.limit) {
    const oldest = hits[0].createdAt.getTime();
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + rule.windowMs - now.getTime()) / 1000)) };
  }
  await db.rateLimitHit.create({ data: { key, createdAt: now } });
  return { allowed: true };
}

// Housekeeping: drop hits older than the longest window. Safe to run any time.
export async function pruneRateLimitHits(now: Date = new Date()) {
  const longest = Math.max(...Object.values(RATE_LIMITS).map((r) => r.windowMs));
  await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - longest) } } });
}
