import { describe, expect, it } from "vitest";
import { weatherTipRules } from "@/config/weather-tips";
import type { DailyForecast } from "@/lib/adapters/weather";
import { describeWeather, farmingTips } from "@/lib/weather/tips";

function week(overrides: Partial<DailyForecast>[] = []): DailyForecast[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-0${i + 1}`,
    weatherCode: 2,
    tempMaxC: 30,
    tempMinC: 22,
    rainMm: 5,
    rainChancePct: 40,
    ...(overrides[i] ?? {}),
  }));
}

describe("farmingTips", () => {
  it("gives no tips for an ordinary week", () => {
    expect(farmingTips(week())).toEqual([]);
  });

  it("warns about the first heavy-rain day (20 mm or more)", () => {
    const days = week([{}, { rainMm: 19.9 }, {}, { rainMm: 28.4 }, { rainMm: 40 }]);
    expect(farmingTips(days)).toEqual([{ rule: "heavyRain", date: "2026-11-04", rainMm: 28 }]);
  });

  it("detects a dry spell of 5+ days under 1 mm and reports how long it lasts", () => {
    const days = week([{ rainMm: 3 }, { rainMm: 0 }, { rainMm: 0.2 }, { rainMm: 0 }, { rainMm: 0.9 }, { rainMm: 0 }, { rainMm: 0 }]);
    expect(farmingTips(days)).toEqual([{ rule: "dryspell", date: "2026-11-02", days: 6 }]);
  });

  it("ignores dry runs shorter than 5 days", () => {
    const days = week([{ rainMm: 0 }, { rainMm: 0 }, { rainMm: 0 }, { rainMm: 0 }, { rainMm: 2 }, { rainMm: 0 }, { rainMm: 0 }]);
    expect(farmingTips(days)).toEqual([]);
  });

  it("warns about heat at 35°C or more", () => {
    expect(farmingTips(week([{}, {}, { tempMaxC: 35.4 }]))).toEqual([{ rule: "heat", date: "2026-11-03", tempMaxC: 35 }]);
  });

  it("lists several tips in date order", () => {
    const days = week([{ tempMaxC: 36 }, {}, {}, {}, {}, { rainMm: 25 }]);
    expect(farmingTips(days).map((t) => t.rule)).toEqual(["heat", "heavyRain"]);
  });

  it("uses the thresholds from config, so agronomists can change them", () => {
    const days = week([{ rainMm: 12 }]);
    expect(farmingTips(days)).toEqual([]);
    expect(farmingTips(days, { ...weatherTipRules, heavyRain: { minRainMm: 10 } })).toEqual([{ rule: "heavyRain", date: "2026-11-01", rainMm: 12 }]);
  });
});

describe("describeWeather", () => {
  it.each([
    [0, "clear"],
    [2, "cloudy"],
    [45, "fog"],
    [53, "drizzle"],
    [63, "rain"],
    [81, "showers"],
    [95, "storm"],
  ])("WMO code %i is %s", (code, key) => {
    expect(describeWeather(code).key).toBe(key);
  });
});
