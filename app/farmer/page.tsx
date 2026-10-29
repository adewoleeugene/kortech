import type { Metadata } from "next";
import Link from "next/link";
import { TipsList, dayLabel } from "@/components/forecast-view";
import { requireArea } from "@/lib/auth/server";
import { getFarmerProfile } from "@/lib/farmer/profile";
import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import { getDistrictForecast } from "@/lib/weather/forecast";
import { describeWeather } from "@/lib/weather/tips";

export const metadata: Metadata = { title: "My farm" };

const upcoming: { key: TranslationKey; icon: string }[] = [
  { key: "home.featureAdvice", icon: "🌱" },
  { key: "home.featureMarket", icon: "🧺" },
  { key: "home.featureFinance", icon: "🏦" },
];

export default async function FarmerDashboard() {
  // The layout already checked access; this re-check keeps the page safe on its own.
  const user = await requireArea("farmer");
  const [{ t, locale }, profile] = await Promise.all([getTranslator(), getFarmerProfile(user.id)]);
  if (!profile) return null;
  const forecast = await getDistrictForecast(profile.districtId);
  const today = forecast?.days[0];

  const unit = profile.farmSizeUnit === "HECTARE" ? t("onboarding.unitHectare") : t("onboarding.unitAcre");
  const rows: [string, string][] = [
    [t("farmer.district"), profile.district.name],
    [t("farmer.chiefdom"), profile.chiefdom?.name ?? t("farmer.notSet")],
    [t("farmer.crops"), profile.crops.map((c) => c.name).join(", ")],
    [t("farmer.farmSize"), profile.farmSize ? t("farmer.farmSizeValue", { size: profile.farmSize.toString(), unit }) : t("farmer.notSet")],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("farmer.welcome", { name: user.name ?? "" })}</h1>

      <section className="space-y-3 rounded-lg border-2 border-border p-4" aria-labelledby="weather-heading">
        <h2 id="weather-heading" className="text-lg font-semibold">{t("farmer.weatherCard", { district: profile.district.name })}</h2>
        {today ? (
          <>
            <p className="flex items-center gap-3">
              <span aria-hidden className="text-4xl">{describeWeather(today.weatherCode).icon}</span>
              <span>
                <span className="block font-semibold">
                  {dayLabel(t, locale, today.date)}: {t(`weather.cond_${describeWeather(today.weatherCode).key}`)}
                </span>
                <span className="block text-sm text-muted">
                  {t("weather.temps", { max: Math.round(today.tempMaxC), min: Math.round(today.tempMinC) })} · {t("weather.rain", { mm: Math.round(today.rainMm) })}
                </span>
              </span>
            </p>
            <TipsList days={forecast.days} t={t} locale={locale} />
          </>
        ) : (
          <p className="text-muted">{t("weather.unavailable")}</p>
        )}
        <Link href={`/weather?district=${profile.district.slug}`} className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
          {t("weather.openFull")} →
        </Link>
      </section>

      <section className="space-y-2" aria-labelledby="guides-heading">
        <h2 id="guides-heading" className="text-lg font-semibold">{t("farmer.guidesCard")}</h2>
        <ul className="flex flex-wrap gap-2">
          {profile.crops.map((c) => (
            <li key={c.id}>
              <Link href={`/guides/${c.slug}`} className="inline-flex min-h-12 items-center rounded-full border-2 border-brand px-4 font-semibold text-brand">
                🌱 {c.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/guides" className="inline-flex min-h-12 items-center px-2 text-muted underline underline-offset-4">{t("guides.allCrops")}</Link>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("farmer.yourFarm")}</h2>
        <dl className="divide-y divide-border rounded-lg border border-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Link href="/onboarding" className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
          {t("farmer.editProfile")}
        </Link>
      </section>

      <Link href="/suppliers" className="flex min-h-16 items-center gap-3 rounded-lg border-2 border-brand px-4 py-3">
        <span aria-hidden className="text-2xl">🧰</span>
        <span>
          <span className="block font-semibold">{t("farmer.findSuppliers")}</span>
          <span className="block text-sm text-muted">{t("farmer.findSuppliersHint")}</span>
        </span>
      </Link>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("farmer.comingSoon")}</h2>
        <p className="text-muted">{t("farmer.comingSoonIntro")}</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {upcoming.map((f) => (
            <li key={f.key} className="flex min-h-14 items-center gap-3 px-4">
              <span aria-hidden className="text-2xl">{f.icon}</span>
              <span>{t(f.key)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
