import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForecastDays, TipsList } from "@/components/forecast-view";
import { Icon, weatherIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { listDistricts } from "@/lib/reference";
import { getDistrictForecast } from "@/lib/weather/forecast";
import { describeWeather } from "@/lib/weather/tips";

export const metadata: Metadata = { title: "Weather" };

const DEFAULT_DISTRICT = "western-area-urban";

// Public. The district is in the URL (?district=bo) so each district's page can be saved for offline use.
export default async function WeatherPage({ searchParams }: { searchParams: Promise<{ district?: string }> }) {
  const { district: slug } = await searchParams;

  if (!slug) {
    // Signed-in farmers go straight to their own district.
    const user = await getCurrentUser();
    const profile = user?.role === "FARMER"
      ? await db.farmerProfile.findUnique({ where: { userId: user.id }, select: { district: { select: { slug: true } } } })
      : null;
    redirect(`/weather?district=${profile?.district.slug ?? DEFAULT_DISTRICT}`);
  }

  const [{ t, locale }, districts] = await Promise.all([getTranslator(), listDistricts()]);
  const district = districts.find((d) => d.slug === slug);
  if (!district) redirect(`/weather?district=${DEFAULT_DISTRICT}`);

  const forecast = await getDistrictForecast(district.id);
  const time = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Freetown" }).format(d);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("weather.forecastFor", { district: district.name })}</h1>

      <form method="get" action="/weather" className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="district" className="block text-sm font-bold">{t("weather.districtLabel")}</label>
          <select id="district" name="district" defaultValue={district.slug} className="min-h-12 w-full rounded-xl border-[1.5px] border-border bg-surface px-3.5">
            {districts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </div>
        <button type="submit" className="min-h-12 rounded-xl bg-brand px-5 font-bold text-white hover:bg-brand-dark">{t("weather.show")}</button>
      </form>

      {!forecast ? (
        <p role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3">{t("weather.unavailable")}</p>
      ) : (
        <>
          {forecast.stale && (
            <p role="status" className="rounded-2xl border border-border bg-surface px-4 py-3">{t("weather.stale", { time: time(forecast.fetchedAt) })}</p>
          )}
          {forecast.days[0] && (
            <section aria-label={t("weather.today")} className="flex items-center gap-4 rounded-3xl bg-brand p-5 text-white">
              <Icon name={weatherIcon(describeWeather(forecast.days[0].weatherCode).key)} size={60} strokeWidth={1.5} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-brand-tint">{t("weather.today")}</p>
                <p className="text-lg font-bold">{t(`weather.cond_${describeWeather(forecast.days[0].weatherCode).key}`)}</p>
                <p className="text-sm text-brand-tint">{t("weather.rain", { mm: Math.round(forecast.days[0].rainMm) })}</p>
              </div>
              <p className="font-display text-5xl leading-none font-bold">{Math.round(forecast.days[0].tempMaxC)}°</p>
            </section>
          )}
          <section className="space-y-3" aria-labelledby="tips-heading">
            <h2 id="tips-heading" className="text-xl font-bold">{t("weather.tipsTitle")}</h2>
            <TipsList days={forecast.days} t={t} locale={locale} />
          </section>
          <ForecastDays days={forecast.days} t={t} locale={locale} />
          <p className="text-sm text-muted">
            {t("weather.updated", { time: time(forecast.fetchedAt) })} · {t("weather.source")}
          </p>
        </>
      )}
    </div>
  );
}
