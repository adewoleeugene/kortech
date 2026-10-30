import type { Metadata } from "next";
import Link from "next/link";
import { dayLabel, shortDayLabel, tipText } from "@/components/forecast-view";
import { Icon, weatherIcon } from "@/components/icons";
import { RegisteredAsNotice } from "@/components/registered-as-notice";
import { requireArea } from "@/lib/auth/server";
import { getFarmerProfile } from "@/lib/farmer/profile";
import { getTranslator } from "@/lib/i18n/server";
import { getDistrictForecast } from "@/lib/weather/forecast";
import { describeWeather, farmingTips } from "@/lib/weather/tips";

export const metadata: Metadata = { title: "My farm" };

export default async function FarmerDashboard({ searchParams }: { searchParams: Promise<{ registeredAs?: string }> }) {
  const { registeredAs } = await searchParams;
  // The layout already checked access; this re-check keeps the page safe on its own.
  const user = await requireArea("farmer");
  const [{ t, locale }, profile] = await Promise.all([getTranslator(), getFarmerProfile(user.id)]);
  if (!profile) return null;
  const forecast = await getDistrictForecast(profile.districtId);
  const today = forecast?.days[0];
  const week = forecast?.days.slice(1) ?? [];
  const tips = forecast ? farmingTips(forecast.days) : [];

  const unit = profile.farmSizeUnit === "HECTARE" ? t("onboarding.unitHectare") : t("onboarding.unitAcre");
  const rows: [string, string][] = [
    [t("farmer.district"), profile.district.name],
    [t("farmer.chiefdom"), profile.chiefdom?.name ?? t("farmer.notSet")],
    [t("farmer.crops"), profile.crops.map((c) => c.name).join(", ")],
    [t("farmer.farmSize"), profile.farmSize ? t("farmer.farmSizeValue", { size: profile.farmSize.toString(), unit }) : t("farmer.notSet")],
  ];

  return (
    <div className="wide space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{t("farmer.welcome", { name: user.name ?? "" })}</h1>
        <p className="text-muted">
          {profile.district.name} · {profile.crops.map((c) => c.name).join(", ")}
        </p>
      </div>

      <RegisteredAsNotice registeredAs={registeredAs} />

      {profile.verificationStatus === "PENDING" && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-3">
          <Icon name="shield" className="shrink-0 text-brand" />
          {t("photos.pendingBanner")}
        </p>
      )}

      <div className="flex flex-wrap gap-5">
        <section aria-labelledby="weather-heading" className="flex min-w-0 flex-[2_1_460px] flex-col gap-4 rounded-3xl bg-brand p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 id="weather-heading" className="font-sans text-[15px] font-semibold tracking-normal text-brand-tint">
                {t("farmer.weatherCard", { district: profile.district.name })}
              </h2>
              {today ? (
                <>
                  <p className="flex items-baseline gap-3">
                    <span className="font-display text-6xl leading-none font-bold">{Math.round(today.tempMaxC)}°</span>
                    <span className="text-brand-tint">{t("farmer.low", { temp: Math.round(today.tempMinC) })}</span>
                  </p>
                  <p className="text-lg font-semibold">
                    {dayLabel(t, locale, today.date)}: {t(`weather.cond_${describeWeather(today.weatherCode).key}`)} ·{" "}
                    {t("weather.rain", { mm: Math.round(today.rainMm) })}
                  </p>
                </>
              ) : (
                <p className="text-lg">{t("weather.unavailable")}</p>
              )}
            </div>
            {today && <Icon name={weatherIcon(describeWeather(today.weatherCode).key)} size={68} strokeWidth={1.5} />}
          </div>

          {week.length > 0 && (
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(70px,1fr))] gap-2 border-t border-white/20 pt-4">
              {week.map((d) => (
                <li key={d.date} className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-center">
                  <span className="text-[13px] text-brand-tint">{shortDayLabel(locale, d.date)}</span>
                  <Icon name={weatherIcon(describeWeather(d.weatherCode).key)} size={20} />
                  <span className="text-[15px] font-bold">
                    {Math.round(d.tempMaxC)}° / {Math.round(d.tempMinC)}°
                  </span>
                  <span className="text-xs text-brand-tint">{t("weather.rain", { mm: Math.round(d.rainMm) })}</span>
                </li>
              ))}
            </ol>
          )}

          {tips.length > 0 ? (
            <ul className="space-y-2" data-testid="weather-tips">
              {tips.map((tip) => (
                <li key={tip.rule} className="flex gap-3 rounded-2xl bg-sun-soft px-4 py-3 text-sun-ink">
                  <Icon name="bulb" className="shrink-0" />
                  <span className="text-[15px] leading-snug font-medium">{tipText(t, locale, tip)}</span>
                </li>
              ))}
            </ul>
          ) : (
            today && <p className="text-[15px] text-brand-tint">{t("weather.noTips")}</p>
          )}

          <Link
            href={`/weather?district=${profile.district.slug}`}
            className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-white underline underline-offset-4 hover:text-brand-tint"
          >
            {t("weather.openFull")} <Icon name="arrowRight" size={18} />
          </Link>
        </section>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Link
            href="/farmer/assistant"
            className="flex flex-col gap-3 rounded-3xl border-2 border-brand bg-surface p-5 text-foreground no-underline hover:bg-brand-soft hover:text-foreground"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-white">
                <Icon name="chat" />
              </span>
              <span className="font-display text-xl font-bold">{t("farmer.askCard")}</span>
            </span>
            <span className="text-[15px] text-muted">{t("farmer.askCardHint")}</span>
            <span className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 text-[15px] text-muted">
              {t("assistant.questionPlaceholder")}
              <Icon name="arrowRight" size={18} className="shrink-0 text-brand" />
            </span>
          </Link>

          <Link
            href="/suppliers"
            className="flex items-center gap-3 rounded-[20px] border border-border bg-surface p-4 text-foreground no-underline hover:border-brand hover:text-foreground"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon name="store" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold">{t("farmer.findSuppliers")}</span>
              <span className="block text-sm text-muted">{t("farmer.findSuppliersHint")}</span>
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["basket", "farmer.sellTitle", "farmer.sellHint"],
                ["bank", "farmer.loansTitle", "farmer.loansHint"],
              ] as const
            ).map(([icon, title, hint]) => (
              <div key={title} className="flex flex-col gap-1.5 rounded-[18px] border border-border bg-surface p-4">
                <span className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-[10px] bg-sun-soft text-sun-ink">
                    <Icon name={icon} size={20} />
                  </span>
                  <span className="rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sun-ink">{t("farmer.soon")}</span>
                </span>
                <span className="font-bold">{t(title)}</span>
                <span className="text-[13px] text-muted">{t(hint)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <section aria-labelledby="guides-heading" className="flex min-w-0 flex-[2_1_460px] flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="guides-heading" className="text-2xl font-bold">{t("farmer.guidesCard")}</h2>
            <Link href="/guides" className="text-[15px] font-semibold">{t("guides.allCrops")}</Link>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            {profile.crops.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/guides/${c.slug}`}
                  className="flex h-full items-center gap-3 rounded-[20px] border border-border bg-surface p-4 text-foreground no-underline hover:border-brand hover:text-foreground"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon name="sprout" />
                  </span>
                  <span className="text-lg font-bold">{c.name}</span>
                  <Icon name="arrowRight" size={18} className="ml-auto text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="farm-heading" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
          <h2 id="farm-heading" className="text-2xl font-bold">{t("farmer.yourFarm")}</h2>
          <dl className="divide-y divide-border rounded-[20px] border border-border bg-surface">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/onboarding" className="inline-flex min-h-11 items-center font-semibold">
            {t("farmer.editProfile")}
          </Link>
        </section>
      </div>
    </div>
  );
}
