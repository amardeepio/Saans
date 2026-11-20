import type { AirReading } from "./types";

export const AIR_CACHE_KEY = "saans.air-cache.v1";
const MAX_CITIES = 8;

interface CacheShape {
  version: 1;
  cities: Record<string, { savedAt: string; reading: AirReading }>;
}

function load(): CacheShape {
  if (typeof window === "undefined") return { version: 1, cities: {} };
  try {
    const raw = window.localStorage.getItem(AIR_CACHE_KEY);
    if (!raw) return { version: 1, cities: {} };
    const parsed = JSON.parse(raw) as Partial<CacheShape>;
    if (!parsed || parsed.version !== 1 || typeof parsed.cities !== "object" || !parsed.cities) {
      return { version: 1, cities: {} };
    }
    return { version: 1, cities: parsed.cities };
  } catch {
    return { version: 1, cities: {} };
  }
}

export function cacheReading(reading: AirReading): void {
  if (typeof window === "undefined") return;
  try {
    const cache = load();
    cache.cities[reading.city.id] = {
      savedAt: new Date().toISOString(),
      reading,
    };
    const keys = Object.keys(cache.cities);
    if (keys.length > MAX_CITIES) {
      keys
        .sort((a, b) => {
          const left = cache.cities[a]?.savedAt ?? "";
          const right = cache.cities[b]?.savedAt ?? "";
          return left.localeCompare(right);
        })
        .slice(0, keys.length - MAX_CITIES)
        .forEach((key) => delete cache.cities[key]);
    }
    window.localStorage.setItem(AIR_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Caching is a bonus; failure should never block the plan.
  }
}

export function getCachedReading(cityId: string): AirReading | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = load().cities[cityId];
    if (!cached?.reading || !cached.savedAt) return null;
    return cached.reading;
  } catch {
    return null;
  }
}

export function getCachedReadingAge(cityId: string): string | null {
  const reading = getCachedReading(cityId);
  if (!reading) return null;
  return reading.observedAt;
}
