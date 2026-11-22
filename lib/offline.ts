import { OFFLINE_CACHE_MAX_CITIES } from "./constants";
import { readStorage, writeStorage } from "./storage";
import type { AirReading } from "./types";

export const AIR_CACHE_KEY = "saans.air-cache.v1";

interface CacheShape {
  version: 1;
  cities: Record<string, { savedAt: string; reading: AirReading }>;
}

function emptyCache(): CacheShape {
  return { version: 1, cities: {} };
}

function parseCache(raw: string | null): CacheShape {
  if (!raw) return emptyCache();
  try {
    const parsed = JSON.parse(raw) as Partial<CacheShape> | null;
    if (!parsed || parsed.version !== 1 || typeof parsed.cities !== "object" || !parsed.cities) {
      return emptyCache();
    }
    return { version: 1, cities: parsed.cities };
  } catch {
    return emptyCache();
  }
}

function load(): CacheShape {
  return parseCache(readStorage(AIR_CACHE_KEY));
}

export function cacheReading(reading: AirReading): void {
  const cache = load();
  cache.cities[reading.city.id] = {
    savedAt: new Date().toISOString(),
    reading,
  };
  const keys = Object.keys(cache.cities);
  if (keys.length > OFFLINE_CACHE_MAX_CITIES) {
    keys
      .sort((a, b) => {
        const left = cache.cities[a]?.savedAt ?? "";
        const right = cache.cities[b]?.savedAt ?? "";
        return left.localeCompare(right);
      })
      .slice(0, keys.length - OFFLINE_CACHE_MAX_CITIES)
      .forEach((key) => delete cache.cities[key]);
  }
  writeStorage(AIR_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedReading(cityId: string): AirReading | null {
  return load().cities[cityId]?.reading ?? null;
}

export function getCachedReadingAge(cityId: string): string | null {
  const reading = getCachedReading(cityId);
  if (!reading) return null;
  return reading.observedAt;
}
