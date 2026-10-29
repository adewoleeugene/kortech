import type { DailyForecast } from "@/lib/adapters/weather";
import type { Translator } from "@/lib/i18n";
import { type WeatherTip, describeWeather, farmingTips } from "@/lib/weather/tips";

// Sierra Leone is on GMT all year, so dates are compared in UTC.
export function dayLabel(t: Translator, locale: string, date: string, now: Date = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  if (date === today) return t("weather.today");
  if (date === tomorrow) return t("weather.tomorrow");
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function tipText(t: Translator, locale: string, tip: WeatherTip) {
  const day = dayLabel(t, locale, tip.date).toLowerCase();
  switch (tip.rule) {
    case "heavyRain":
      return t("weather.tip_heavyRain", { day, mm: tip.rainMm });
    case "dryspell":
      return t("weather.tip_dryspell", { day, days: tip.days });
    case "heat":
      return t("weather.tip_heat", { day, temp: tip.tempMaxC });
  }
}

export function TipsList({ days, t, locale }: { days: DailyForecast[]; t: Translator; locale: string }) {
  const tips = farmingTips(days);
  if (!tips.length) return <p className="text-muted">{t("weather.noTips")}</p>;
  return (
    <ul className="space-y-2" data-testid="weather-tips">
      {tips.map((tip) => (
        <li key={tip.rule} className="flex gap-3 rounded-lg bg-amber-100 px-4 py-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <span aria-hidden>💡</span>
          <span>{tipText(t, locale, tip)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ForecastDays({ days, t, locale }: { days: DailyForecast[]; t: Translator; locale: string }) {
  return (
    <ol className="divide-y divide-border rounded-lg border border-border" data-testid="forecast-days">
      {days.map((d) => {
        const w = describeWeather(d.weatherCode);
        return (
          <li key={d.date} className="flex min-h-16 items-center gap-3 px-4 py-2">
            <span aria-hidden className="text-3xl">{w.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{dayLabel(t, locale, d.date)}</span>
              <span className="block text-sm text-muted">
                {t(`weather.cond_${w.key}`)} · {t("weather.rain", { mm: Math.round(d.rainMm) })}
                {d.rainChancePct !== null && ` · ${t("weather.rainChance", { pct: d.rainChancePct })}`}
              </span>
            </span>
            <span className="shrink-0 text-right font-semibold">
              {t("weather.temps", { max: Math.round(d.tempMaxC), min: Math.round(d.tempMinC) })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
