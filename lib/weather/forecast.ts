import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { type DailyForecast, getWeatherProvider } from "@/lib/adapters/weather";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

// PRD 6.4: cache per district for 3 hours.
export const WEATHER_CACHE_TTL_MS = 3 * 60 * 60_000;

const cachedSchema = z.array(
  z.object({
    date: z.string(),
    weatherCode: z.number(),
    tempMaxC: z.number(),
    tempMinC: z.number(),
    rainMm: z.number(),
    rainChancePct: z.number().nullable(),
  }),
);

export type DistrictForecast = {
  district: { id: string; name: string };
  days: DailyForecast[];
  fetchedAt: Date;
  // True when the provider failed and an older cached forecast is shown instead.
  stale: boolean;
};

// Returns the cached forecast if it's fresh, otherwise fetches and caches a new one.
// If the provider is down, falls back to the last cached forecast (marked stale), or null.
export async function getDistrictForecast(districtId: string, now: Date = new Date()): Promise<DistrictForecast | null> {
  const district = await db.district.findUnique({ where: { id: districtId }, include: { weatherCache: true } });
  if (!district) return null;
  const cache = district.weatherCache;
  const cached = cache ? cachedSchema.safeParse(cache.forecast) : null;

  if (cache && cached?.success && now.getTime() - cache.fetchedAt.getTime() < WEATHER_CACHE_TTL_MS) {
    return { district: { id: district.id, name: district.name }, days: cached.data, fetchedAt: cache.fetchedAt, stale: false };
  }

  const provider = getWeatherProvider();
  try {
    const days = await provider.getDailyForecast(district.latitude, district.longitude);
    const forecast = days as unknown as Prisma.InputJsonValue;
    await db.weatherCache.upsert({
      where: { districtId },
      create: { districtId, provider: provider.name, forecast, fetchedAt: now },
      update: { provider: provider.name, forecast, fetchedAt: now },
    });
    return { district: { id: district.id, name: district.name }, days, fetchedAt: now, stale: false };
  } catch (err) {
    logger.warn("weather fetch failed", { err, districtId, provider: provider.name });
    if (cache && cached?.success) {
      return { district: { id: district.id, name: district.name }, days: cached.data, fetchedAt: cache.fetchedAt, stale: true };
    }
    return null;
  }
}
