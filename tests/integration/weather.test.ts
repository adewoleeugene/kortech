import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FailingWeatherProvider, MockWeatherProvider, OpenMeteoProvider, setWeatherProvider } from "@/lib/adapters/weather";
import { db } from "@/lib/db";
import { WEATHER_CACHE_TTL_MS, getDistrictForecast } from "@/lib/weather/forecast";
import { seedReferenceData } from "@/prisma/seed-reference";

let bo: { id: string; latitude: number; longitude: number };
const T0 = new Date("2026-11-01T06:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

beforeAll(async () => {
  await seedReferenceData(db);
  bo = await db.district.findUniqueOrThrow({ where: { slug: "bo" } });
});
beforeEach(() => db.weatherCache.deleteMany());
afterEach(() => {
  setWeatherProvider(null);
  vi.unstubAllGlobals();
});
afterAll(() => db.$disconnect());

describe("district forecast cache (3 hours)", () => {
  it("fetches once, then serves repeat requests within 3 hours from the cache", async () => {
    const provider = new MockWeatherProvider(null, T0);
    setWeatherProvider(provider);

    const first = await getDistrictForecast(bo.id, T0);
    expect(first?.days).toHaveLength(7);
    expect(first?.district.name).toBe("Bo");
    await getDistrictForecast(bo.id, at(60 * 60_000));
    await getDistrictForecast(bo.id, at(WEATHER_CACHE_TTL_MS - 1));
    expect(provider.calls).toBe(1);

    const later = await getDistrictForecast(bo.id, at(WEATHER_CACHE_TTL_MS));
    expect(provider.calls).toBe(2);
    expect(later?.fetchedAt).toEqual(at(WEATHER_CACHE_TTL_MS));
  });

  it("caches each district separately", async () => {
    const provider = new MockWeatherProvider(null, T0);
    setWeatherProvider(provider);
    const kenema = await db.district.findUniqueOrThrow({ where: { slug: "kenema" } });
    await getDistrictForecast(bo.id, T0);
    await getDistrictForecast(kenema.id, T0);
    await getDistrictForecast(bo.id, T0);
    expect(provider.calls).toBe(2);
    expect(await db.weatherCache.count()).toBe(2);
  });

  it("shows the last forecast, marked stale, when the provider is down", async () => {
    setWeatherProvider(new MockWeatherProvider(null, T0));
    await getDistrictForecast(bo.id, T0);
    setWeatherProvider(new FailingWeatherProvider());
    const stale = await getDistrictForecast(bo.id, at(WEATHER_CACHE_TTL_MS + 1));
    expect(stale?.stale).toBe(true);
    expect(stale?.fetchedAt).toEqual(T0);
    expect(stale?.days).toHaveLength(7);
  });

  it("returns null when the provider is down and nothing is cached", async () => {
    setWeatherProvider(new FailingWeatherProvider());
    expect(await getDistrictForecast(bo.id, T0)).toBeNull();
    expect(await getDistrictForecast("missing", T0)).toBeNull();
  });
});

describe("Open-Meteo adapter", () => {
  it("requests the district's coordinates and maps the daily forecast", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        daily: {
          time: ["2026-11-01", "2026-11-02"],
          weather_code: [95, null],
          temperature_2m_max: [30.4, 29.5],
          temperature_2m_min: [23.4, 22.6],
          precipitation_sum: [10.8, null],
          precipitation_probability_max: [80, 20],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const days = await new OpenMeteoProvider().getDailyForecast(bo.latitude, bo.longitude);
    expect(days).toEqual([
      { date: "2026-11-01", weatherCode: 95, tempMaxC: 30.4, tempMinC: 23.4, rainMm: 10.8, rainChancePct: 80 },
      { date: "2026-11-02", weatherCode: 0, tempMaxC: 29.5, tempMinC: 22.6, rainMm: 0, rainChancePct: 20 },
    ]);
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get("latitude")).toBe(bo.latitude.toFixed(4));
    expect(url.searchParams.get("longitude")).toBe(bo.longitude.toFixed(4));
    expect(url.searchParams.get("timezone")).toBe("Africa/Freetown");
    expect(url.searchParams.get("forecast_days")).toBe("7");
  });

  it("throws on an error response or an unexpected shape", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(new OpenMeteoProvider().getDailyForecast(1, 1)).rejects.toThrow("500");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ unexpected: true })));
    await expect(new OpenMeteoProvider().getDailyForecast(1, 1)).rejects.toThrow();
  });
});
