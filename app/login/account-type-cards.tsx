import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/auth/account-type";
import { getTranslator } from "@/lib/i18n/server";

export const ACCOUNT_TYPE_ICONS: Record<AccountType, IconName> = { farmer: "sprout", supplier: "store", buyer: "basket", lender: "bank" };

export function loginPath(type: AccountType | "returning", next?: string) {
  return `/login?as=${type}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
}

// "Who are you?" choice, used on the sign-in page and the home page.
export async function AccountTypeCards({ next }: { next?: string }) {
  const { t } = await getTranslator();
  return (
    <div className="space-y-3">
      <ul className="grid gap-3">
        {ACCOUNT_TYPES.map((type) => (
          <li key={type}>
            <Link
              href={loginPath(type, next)}
              className="flex min-h-16 items-center gap-4 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-foreground no-underline hover:border-brand hover:bg-brand-soft hover:text-foreground"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon name={ACCOUNT_TYPE_ICONS[type]} />
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
        <Link href={loginPath("returning", next)} className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
          {t("login.returning")}
        </Link>
      </p>
    </div>
  );
}
