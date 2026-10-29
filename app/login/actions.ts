"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathForRole, safeNextPath } from "@/lib/auth/access";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { getClientIp, signIn } from "@/lib/auth/server";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { normalizeSierraLeonePhone } from "@/lib/phone";

// The number being verified is kept in a short-lived httpOnly cookie,
// so it never appears in a URL (PRD 7, Privacy).
const PENDING_PHONE_COOKIE = "sf_otp_phone";

export type FormState = { error?: string; notice?: string };

const requestSchema = z.object({ phone: z.string().max(30), next: z.string().max(500).optional() });
const verifySchema = z.object({ code: z.string().max(20), next: z.string().max(500).optional() });

function verifyPath(next: string | null) {
  return next ? `/login/verify?next=${encodeURIComponent(next)}` : "/login/verify";
}

async function sendCode(phone: string): Promise<FormState | null> {
  const { t } = await getTranslator();
  const result = await requestOtp(phone, await getClientIp());
  if (!result.ok) return { error: t("login.rateLimited", { minutes: Math.ceil(result.retryAfterSeconds / 60) }) };
  (await cookies()).set(PENDING_PHONE_COOKIE, phone, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/login",
    maxAge: 15 * 60,
  });
  return null;
}

export async function requestOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getTranslator();
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  const phone = parsed.success ? normalizeSierraLeonePhone(parsed.data.phone) : null;
  if (!parsed.success || !phone) return { error: t("login.invalidPhone") };

  const failure = await sendCode(phone);
  if (failure) return failure;
  redirect(verifyPath(safeNextPath(parsed.data.next)));
}

export async function resendOtpAction(): Promise<FormState> {
  const { t } = await getTranslator();
  const phone = (await cookies()).get(PENDING_PHONE_COOKIE)?.value;
  if (!phone) redirect("/login");
  return (await sendCode(phone)) ?? { notice: t("login.codeResent") };
}

export async function verifyOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getTranslator();
  const jar = await cookies();
  const phone = jar.get(PENDING_PHONE_COOKIE)?.value;
  if (!phone) redirect("/login");

  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  const code = parsed.success ? parsed.data.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return { error: t("login.invalidCodeFormat") };

  const result = await verifyOtp(phone, code, await getClientIp());
  if (!result.ok) {
    switch (result.reason) {
      case "invalid":
        return { error: t("login.invalidCode", { count: result.attemptsLeft ?? 0 }) };
      case "expired":
        return { error: t("login.expiredCode") };
      case "too_many_attempts":
        return { error: t("login.tooManyAttempts") };
      case "rate_limited":
        return { error: t("login.verifyRateLimited") };
    }
  }

  const user = await findOrCreateUserByPhone(phone);
  if (!user) return { error: t("login.accountClosed") };
  await signIn(user.id);
  jar.delete({ name: PENDING_PHONE_COOKIE, path: "/login" });

  if (user.role === "FARMER") {
    const hasProfile = await db.farmerProfile.count({ where: { userId: user.id } });
    // New accounts choose: farmer onboarding, or business registration if they came from "I run a business".
    if (!hasProfile) redirect(safeNextPath(parsed.data?.next) === "/register-business" ? "/register-business" : "/onboarding");
  }
  redirect(safeNextPath(parsed.data?.next) ?? homePathForRole(user.role));
}
