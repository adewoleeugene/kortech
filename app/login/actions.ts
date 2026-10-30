"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathForRole, safeNextPath } from "@/lib/auth/access";
import { type AccountType, accountTypeForRole, orgTypeFor, parseAccountType } from "@/lib/auth/account-type";
import { createDemoNewUser, ensureDemoAccount, isDemoAccountKey, isDemoMode } from "@/lib/auth/demo";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { getClientIp, signIn } from "@/lib/auth/server";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { normalizeSierraLeonePhone } from "@/lib/phone";

// The number being verified is kept in a short-lived httpOnly cookie,
// so it never appears in a URL (PRD 7, Privacy).
const PENDING_PHONE_COOKIE = "sf_otp_phone";
// Demo mode only: the latest code, so the verify page can show it.
const DEMO_CODE_COOKIE = "sf_demo_code";

export type FormState = { error?: string; notice?: string };

const requestSchema = z.object({ phone: z.string().max(30), next: z.string().max(500).optional(), as: z.string().max(20).optional() });
const verifySchema = z.object({ code: z.string().max(20), next: z.string().max(500).optional(), as: z.string().max(20).optional() });

function verifyPath(next: string | null, accountType: AccountType | null) {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (accountType) params.set("as", accountType);
  const query = params.toString();
  return query ? `/login/verify?${query}` : "/login/verify";
}

async function sendCode(phone: string): Promise<FormState | null> {
  const { t } = await getTranslator();
  const result = await requestOtp(phone, await getClientIp());
  if (!result.ok) return { error: t("login.rateLimited", { minutes: Math.ceil(result.retryAfterSeconds / 60) }) };
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/login" };
  jar.set(PENDING_PHONE_COOKIE, phone, { ...options, maxAge: 15 * 60 });
  if (result.demoCode) jar.set(DEMO_CODE_COOKIE, result.demoCode, { ...options, maxAge: 5 * 60 });
  return null;
}

export async function requestOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getTranslator();
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  const phone = parsed.success ? normalizeSierraLeonePhone(parsed.data.phone) : null;
  if (!parsed.success || !phone) return { error: t("login.invalidPhone") };

  const failure = await sendCode(phone);
  if (failure) return failure;
  redirect(verifyPath(safeNextPath(parsed.data.next), parseAccountType(parsed.data.as)));
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
  jar.delete({ name: DEMO_CODE_COOKIE, path: "/login" });

  const next = safeNextPath(parsed.data?.next);
  const chosen = parseAccountType(parsed.data?.as) ?? (next === "/register-business" ? "supplier" : null);

  if (user.role === "FARMER") {
    const hasProfile = await db.farmerProfile.count({ where: { userId: user.id } });
    // A new (or unfinished) account follows the type chosen at sign-in.
    if (!hasProfile) {
      const orgType = chosen && orgTypeFor(chosen);
      redirect(orgType ? `/register-business?type=${orgType}` : "/onboarding");
    }
  }
  // An existing account keeps its type; tell them if they picked a different one.
  const registeredAs = accountTypeForRole(user.role);
  if (chosen && registeredAs && chosen !== registeredAs) redirect(`${homePathForRole(user.role)}?registeredAs=${registeredAs}`);
  redirect(next ?? homePathForRole(user.role));
}

// Demo mode only: sign straight in as a sample account, or as a new account to try sign-up.
export async function demoSignInAction(formData: FormData) {
  if (!isDemoMode()) redirect("/login");
  const key = String(formData.get("account") ?? "");

  if (key === "newFarmer" || key === "newBusiness") {
    const user = await createDemoNewUser();
    await signIn(user.id);
    redirect(key === "newBusiness" ? "/register-business" : "/onboarding");
  }
  if (!isDemoAccountKey(key)) redirect("/login");

  const user = await ensureDemoAccount(key);
  await signIn(user.id);
  redirect(homePathForRole(user.role));
}
