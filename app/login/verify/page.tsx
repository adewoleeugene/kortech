import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, jar, { next }] = await Promise.all([getTranslator(), cookies(), searchParams]);
  const phone = jar.get("sf_otp_phone")?.value;
  if (!phone) redirect("/login");
  const display = formatPhoneForDisplay(phone);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("login.verifyTitle")}</h1>
        <p className="text-muted">{t("login.verifyIntro", { phone: display })}</p>
      </div>
      <VerifyForm
        next={safeNextPath(next) ?? undefined}
        labels={{
          codeLabel: t("login.codeLabel"),
          verify: t("login.verify"),
          resend: t("login.resend"),
        }}
      />
      <p className="text-center">
        <Link href="/login" className="inline-flex min-h-12 items-center text-muted underline underline-offset-4">
          {t("login.changeNumber")}
        </Link>
      </p>
    </div>
  );
}
