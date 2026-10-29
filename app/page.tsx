import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import { countDistricts } from "@/lib/reference";

export const dynamic = "force-dynamic";

const features: { key: TranslationKey; icon: string }[] = [
  { key: "home.featureAdvice", icon: "🌱" },
  { key: "home.featureWeather", icon: "🌦️" },
  { key: "home.featureSuppliers", icon: "🧰" },
  { key: "home.featureMarket", icon: "🧺" },
  { key: "home.featureFinance", icon: "🏦" },
];

export default async function HomePage() {
  const [{ t }, districtCount] = await Promise.all([getTranslator(), countDistricts()]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold leading-tight">{t("home.title")}</h1>
        <p className="text-muted">{t("home.intro")}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {/* Sign-in arrives in Milestone 2; these are placeholders for the two entry points. */}
        <span className="flex min-h-14 items-center justify-center rounded-lg bg-brand px-4 text-lg font-semibold text-brand-foreground">
          {t("home.farmerCta")}
        </span>
        <span className="flex min-h-14 items-center justify-center rounded-lg border-2 border-brand px-4 text-lg font-semibold text-brand">
          {t("home.businessCta")}
        </span>
        <p className="text-sm text-muted sm:col-span-2">{t("home.comingSoon")}</p>
      </section>

      <section>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {features.map((f) => (
            <li key={f.key} className="flex min-h-14 items-center gap-3 px-4">
              <span aria-hidden className="text-2xl">{f.icon}</span>
              <span>{t(f.key)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{t("home.districtsServed", { count: districtCount })}</p>
      </section>
    </div>
  );
}
