import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homePathForRole, safeNextPath } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, user, { next }] = await Promise.all([getTranslator(), getCurrentUser(), searchParams]);
  if (user) redirect(homePathForRole(user.role));

  return (
    <div>
      <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("login.title")}</h1>
        <p className="text-muted">{t("login.intro")}</p>
      </div>
      <PhoneForm
        next={safeNextPath(next) ?? undefined}
        labels={{ phoneLabel: t("login.phoneLabel"), phoneHint: t("login.phoneHint"), sendCode: t("login.sendCode") }}
      />
      </div>
    </div>
  );
}
