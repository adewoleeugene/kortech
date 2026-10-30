import { parseAccountType } from "@/lib/auth/account-type";
import { getTranslator } from "@/lib/i18n/server";

// Shown after sign-in when someone picked a different account type from the one
// their phone number is registered as (?registeredAs=farmer|supplier|buyer|lender).
export async function RegisteredAsNotice({ registeredAs }: { registeredAs?: string }) {
  const type = parseAccountType(registeredAs);
  if (!type) return null;
  const { t } = await getTranslator();
  return (
    <p role="status" className="rounded-2xl bg-brand-soft px-4 py-3">
      {t("login.registeredAs", { type: t(`login.as_${type}`) })}
    </p>
  );
}
