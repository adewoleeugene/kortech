import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { homePathForRole, safeNextPath } from "@/lib/auth/access";
import { parseAccountType } from "@/lib/auth/account-type";
import { isDemoMode } from "@/lib/auth/demo";
import { getCurrentUser } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";
import { ACCOUNT_TYPE_ICONS, AccountTypeCards } from "./account-type-cards";
import { DemoAccounts } from "./demo-accounts";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Sign in" };

// Step 1 asks who you are (?as=farmer|supplier|buyer|lender); step 2 is the phone number.
// Returning users can skip step 1 (?as=returning): their account already has a type.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const [{ t }, user, { next, as }] = await Promise.all([getTranslator(), getCurrentUser(), searchParams]);
  if (user) redirect(homePathForRole(user.role));

  const nextPath = safeNextPath(next) ?? undefined;
  const accountType = parseAccountType(as);

  if (!accountType && as !== "returning") {
    return (
      <div>
        <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t("login.chooseTitle")}</h1>
            <p className="text-muted">{t("login.chooseIntro")}</p>
          </div>
          <AccountTypeCards next={nextPath} />
          {isDemoMode() && <DemoAccounts />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div className="space-y-2">
          {accountType && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-dark">
                <Icon name={ACCOUNT_TYPE_ICONS[accountType]} size={16} />
                {t(`login.as_${accountType}`)}
              </span>
              <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"} className="text-muted underline underline-offset-4">
                {t("login.changeType")}
              </Link>
            </p>
          )}
          <h1 className="text-3xl font-bold">{t("login.title")}</h1>
          <p className="text-muted">{t("login.intro")}</p>
        </div>
        <PhoneForm
          next={nextPath}
          accountType={accountType ?? undefined}
          labels={{ phoneLabel: t("login.phoneLabel"), phoneHint: t("login.phoneHint"), sendCode: t("login.sendCode") }}
        />
      </div>
    </div>
  );
}
