import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForecastDays, TipsList } from "@/components/forecast-view";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { listDistricts } from "@/lib/reference";
import { getDistrictForecast } from "@/lib/weather/forecast";

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
      <h1 className="text-2xl font-bold">{t("weather.forecastFor", { district: district.name })}</h1>

      <form method="get" action="/weather" className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="district" className="block font-semibold">{t("weather.districtLabel")}</label>
          <select id="district" name="district" defaultValue={district.slug} className="min-h-12 w-full rounded-lg border-2 border-border bg-background px-3">
            {districts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </div>
        <button type="submit" className="min-h-12 rounded-lg bg-brand px-5 font-semibold text-brand-foreground">{t("weather.show")}</button>
      </form>

      {!forecast ? (
        <p role="alert" className="rounded-lg bg-surface px-4 py-3">{t("weather.unavailable")}</p>
      ) : (
        <>
          {forecast.stale && (
            <p role="status" className="rounded-lg bg-surface px-4 py-3">{t("weather.stale", { time: time(forecast.fetchedAt) })}</p>
          )}
          <section className="space-y-3" aria-labelledby="tips-heading">
            <h2 id="tips-heading" className="text-lg font-semibold">{t("weather.tipsTitle")}</h2>
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
