import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { homePathForRole, safeNextPath } from "@/lib/auth/access";
import { ACCOUNT_TYPES, type AccountType, parseAccountType } from "@/lib/auth/account-type";
import { isDemoMode } from "@/lib/auth/demo";
import { getCurrentUser } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";
import { DemoAccounts } from "./demo-accounts";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Sign in" };

const ICONS: Record<AccountType, IconName> = { farmer: "sprout", supplier: "store", buyer: "basket", lender: "bank" };

// Step 1 asks who you are (?as=farmer|supplier|buyer|lender); step 2 is the phone number.
// Returning users can skip step 1 (?as=returning): their account already has a type.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const [{ t }, user, { next, as }] = await Promise.all([getTranslator(), getCurrentUser(), searchParams]);
  if (user) redirect(homePathForRole(user.role));

  const nextPath = safeNextPath(next) ?? undefined;
  const accountType = parseAccountType(as);
  const withParams = (type: string) => `/login?as=${type}${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`;

  if (!accountType && as !== "returning") {
    return (
      <div>
        <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t("login.chooseTitle")}</h1>
            <p className="text-muted">{t("login.chooseIntro")}</p>
          </div>
          <ul className="grid gap-3">
            {ACCOUNT_TYPES.map((type) => (
              <li key={type}>
                <Link
                  href={withParams(type)}
                  className="flex min-h-16 items-center gap-4 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-foreground no-underline hover:border-brand hover:bg-brand-soft"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon name={ICONS[type]} />
                  </span>
                  <span>
                    <span className="block font-bold">{t(`login.as_${type}`)}</span>
                    <span className="block text-sm text-muted">{t(`login.as_${type}Hint`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-center">
            <Link href={withParams("returning")} className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
              {t("login.returning")}
            </Link>
          </p>
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
                <Icon name={ICONS[accountType]} size={16} />
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
