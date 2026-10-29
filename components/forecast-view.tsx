import type { DailyForecast } from "@/lib/adapters/weather";
import type { Translator } from "@/lib/i18n";
import { type WeatherTip, describeWeather, farmingTips } from "@/lib/weather/tips";
import { Icon, weatherIcon } from "./icons";

// Sierra Leone is on GMT all year, so dates are compared in UTC.
export function dayLabel(t: Translator, locale: string, date: string, now: Date = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  if (date === today) return t("weather.today");
  if (date === tomorrow) return t("weather.tomorrow");
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

// "Fri", "Sat"… for compact forecast strips.
export function shortDayLabel(locale: string, date: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
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

const TIP_ICON = { heavyRain: "rain", dryspell: "sun", heat: "sun" } as const;

export function TipsList({ days, t, locale }: { days: DailyForecast[]; t: Translator; locale: string }) {
  const tips = farmingTips(days);
  if (!tips.length) return <p className="text-muted">{t("weather.noTips")}</p>;
  return (
    <ul className="space-y-2" data-testid="weather-tips">
      {tips.map((tip) => (
        <li key={tip.rule} className="flex items-start gap-3 rounded-2xl bg-sun-soft px-4 py-3.5 text-sun-ink">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sun text-sun-ink">
            <Icon name={TIP_ICON[tip.rule]} size={20} />
          </span>
          <span className="leading-snug">{tipText(t, locale, tip)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ForecastDays({ days, t, locale }: { days: DailyForecast[]; t: Translator; locale: string }) {
  return (
    <ol className="divide-y divide-border rounded-[20px] border border-border bg-surface" data-testid="forecast-days">
      {days.map((d) => {
        const w = describeWeather(d.weatherCode);
        const wet = d.rainMm >= 20;
        return (
          <li key={d.date} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${wet ? "bg-sun-soft text-sun-ink" : "bg-brand-soft text-brand"}`}>
              <Icon name={weatherIcon(w.key)} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{dayLabel(t, locale, d.date)}</span>
              <span className="block text-sm text-muted">
                {t(`weather.cond_${w.key}`)} · {t("weather.rain", { mm: Math.round(d.rainMm) })}
                {d.rainChancePct !== null && ` · ${t("weather.rainChance", { pct: d.rainChancePct })}`}
              </span>
            </span>
            <span className="shrink-0 text-right font-bold">{t("weather.temps", { max: Math.round(d.tempMaxC), min: Math.round(d.tempMinC) })}</span>
          </li>
        );
      })}
    </ol>
  );
}
