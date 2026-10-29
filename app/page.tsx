import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import { countDistricts } from "@/lib/reference";

export const dynamic = "force-dynamic";

const features: { key: TranslationKey; icon: string; href?: string }[] = [
  { key: "home.featureAdvice", icon: "🌱", href: "/guides" },
  { key: "home.featureWeather", icon: "🌦️", href: "/weather" },
  { key: "home.featureSuppliers", icon: "🧰", href: "/suppliers" },
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
        <Link
          href="/login"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brand px-4 text-lg font-semibold text-brand-foreground"
        >
          {t("home.farmerCta")}
        </Link>
        <Link
          href="/login?next=/register-business"
          className="flex min-h-14 items-center justify-center rounded-lg border-2 border-brand px-4 text-lg font-semibold text-brand"
        >
          {t("home.businessCta")}
        </Link>
        <p className="text-sm text-muted sm:col-span-2">{t("home.businessHint")}</p>
      </section>

      <section>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {features.map((f) => (
            <li key={f.key}>
              {f.href ? (
                <Link href={f.href} className="flex min-h-14 items-center gap-3 px-4 font-semibold text-brand">
                  <span aria-hidden className="text-2xl">{f.icon}</span>
                  <span>{t(f.key)} →</span>
                </Link>
              ) : (
                <span className="flex min-h-14 items-center gap-3 px-4">
                  <span aria-hidden className="text-2xl">{f.icon}</span>
                  <span>{t(f.key)}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{t("home.districtsServed", { count: districtCount })}</p>
      </section>
    </div>
  );
}
