import { type WeatherTipRules, weatherTipRules } from "@/config/weather-tips";
import type { DailyForecast } from "@/lib/adapters/weather";

export type WeatherTip =
  | { rule: "heavyRain"; date: string; rainMm: number }
  | { rule: "dryspell"; date: string; days: number }
  | { rule: "heat"; date: string; tempMaxC: number };

// Turns a forecast into tips. One tip per rule, for the first day it applies, so farmers see what's next.
export function farmingTips(days: DailyForecast[], rules: WeatherTipRules = weatherTipRules): WeatherTip[] {
  const tips: WeatherTip[] = [];

  const rain = days.find((d) => d.rainMm >= rules.heavyRain.minRainMm);
  if (rain) tips.push({ rule: "heavyRain", date: rain.date, rainMm: Math.round(rain.rainMm) });

  // First run of dry days long enough to count, and how long it lasts within the forecast.
  const isDry = (d: DailyForecast) => d.rainMm < rules.dryspell.maxRainMmPerDay;
  for (let start = 0; start < days.length; start++) {
    let length = 0;
    while (start + length < days.length && isDry(days[start + length])) length++;
    if (length >= rules.dryspell.minDays) {
      tips.push({ rule: "dryspell", date: days[start].date, days: length });
      break;
    }
    start += Math.max(0, length - 1);
  }

  const hot = days.find((d) => d.tempMaxC >= rules.heat.minTempMaxC);
  if (hot) tips.push({ rule: "heat", date: hot.date, tempMaxC: Math.round(hot.tempMaxC) });

  return tips.sort((a, b) => a.date.localeCompare(b.date));
}

// WMO weather codes -> a simple picture and a translation key.
export function describeWeather(code: number): { icon: string; key: "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "showers" | "storm" } {
  if (code === 0) return { icon: "☀️", key: "clear" };
  if (code <= 3) return { icon: "⛅", key: "cloudy" };
  if (code === 45 || code === 48) return { icon: "🌫️", key: "fog" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", key: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 71 && code <= 77)) return { icon: "🌧️", key: "rain" };
  if (code >= 80 && code <= 86) return { icon: "🌦️", key: "showers" };
  if (code >= 95) return { icon: "⛈️", key: "storm" };
  return { icon: "⛅", key: "cloudy" };
}
