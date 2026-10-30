import { getTranslator } from "@/lib/i18n/server";
import { demoSignInAction } from "./actions";

// Shown on the sign-in page in demo mode only. Each button signs in as one flow.
const GROUPS = [
  { title: "groupFarmers", accounts: ["farmer", "newFarmer"] },
  { title: "groupBusinesses", accounts: ["supplier", "pendingSupplier", "buyer", "lender", "newBusiness"] },
  { title: "groupStaff", accounts: ["admin", "agronomist"] },
] as const;

export async function DemoAccounts() {
  const { t } = await getTranslator();
  return (
    <section aria-labelledby="demo-title" className="space-y-4 rounded-2xl border-2 border-dashed border-brand bg-brand-soft/40 p-4">
      <div className="space-y-1">
        <h2 id="demo-title" className="text-lg font-bold">
          {t("demo.title")}
        </h2>
        <p className="text-sm text-muted">{t("demo.intro")}</p>
      </div>
      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`demo.${group.title}`)}</h3>
          <div className="grid gap-2">
            {group.accounts.map((account) => (
              <form key={account} action={demoSignInAction}>
                <input type="hidden" name="account" value={account} />
                <button
                  type="submit"
                  className="flex min-h-12 w-full flex-col items-start rounded-xl border border-border bg-surface px-4 py-2 text-left hover:border-brand"
                >
                  <span className="font-semibold">{t(`demo.${account}`)}</span>
                  <span className="text-sm text-muted">{t(`demo.${account}Hint`)}</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
