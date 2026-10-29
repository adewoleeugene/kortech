import { z } from "zod";

// Weather sits behind this interface so the provider can change later (PRD 6.4).
export type DailyForecast = {
  date: string; // YYYY-MM-DD, Sierra Leone time (GMT)
  weatherCode: number; // WMO code
  tempMaxC: number;
  tempMinC: number;
  rainMm: number;
  rainChancePct: number | null;
};

export interface WeatherProvider {
  readonly name: string;
  getDailyForecast(latitude: number, longitude: number): Promise<DailyForecast[]>;
}

// ---------- Open-Meteo (free, no API key) ----------

const openMeteoSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_sum: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()).optional(),
  }),
});

export class OpenMeteoProvider implements WeatherProvider {
  readonly name = "open-meteo";

  constructor(
    private readonly baseUrl = "https://api.open-meteo.com/v1/forecast",
    private readonly timeoutMs = 8_000,
  ) {}

  async getDailyForecast(latitude: number, longitude: number): Promise<DailyForecast[]> {
    const url = new URL(this.baseUrl);
    url.search = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
      timezone: "Africa/Freetown",
      forecast_days: "7",
    }).toString();

    const res = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
    const { daily } = openMeteoSchema.parse(await res.json());
    return daily.time.map((date, i) => ({
      date,
      weatherCode: daily.weather_code[i] ?? 0,
      tempMaxC: daily.temperature_2m_max[i] ?? 0,
      tempMinC: daily.temperature_2m_min[i] ?? 0,
      rainMm: daily.precipitation_sum[i] ?? 0,
      rainChancePct: daily.precipitation_probability_max?.[i] ?? null,
    }));
  }
}

// ---------- Mock (tests and offline development) ----------

// Deterministic: day 2 always has heavy rain, so tips can be tested. Counts calls for cache tests.
export class MockWeatherProvider implements WeatherProvider {
  readonly name = "mock";
  calls = 0;

  constructor(private readonly days: Partial<DailyForecast>[] | null = null, private readonly startDate = new Date()) {}

  async getDailyForecast(): Promise<DailyForecast[]> {
    this.calls += 1;
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(this.startDate.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      const base: DailyForecast = { date, weatherCode: i === 2 ? 63 : 2, tempMaxC: 31, tempMinC: 23, rainMm: i === 2 ? 28 : 2, rainChancePct: i === 2 ? 90 : 30 };
      return { ...base, ...(this.days?.[i] ?? {}) };
    });
  }
}

// Fails every call; for testing stale-cache fallback.
export class FailingWeatherProvider implements WeatherProvider {
  readonly name = "failing";
  async getDailyForecast(): Promise<DailyForecast[]> {
    throw new Error("weather provider unavailable");
  }
}

let provider: WeatherProvider | null = null;

export function getWeatherProvider(): WeatherProvider {
  if (provider) return provider;
  const kind = process.env.WEATHER_PROVIDER ?? "open-meteo";
  if (kind === "mock") provider = new MockWeatherProvider();
  else if (kind === "open-meteo") provider = new OpenMeteoProvider();
  else throw new Error(`Unknown WEATHER_PROVIDER "${kind}"`);
  return provider;
}

export function setWeatherProvider(next: WeatherProvider | null) {
  provider = next;
}
