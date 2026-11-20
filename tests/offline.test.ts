import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheReading, getCachedReading, getCachedReadingAge } from "@/lib/offline";
import { sampleReading } from "@/lib/sample-air";
import { DEFAULT_CITY } from "@/lib/cities";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
});

describe("offline reading cache", () => {
  it("stores and reads back the last reading for a city", () => {
    const reading = sampleReading(DEFAULT_CITY, new Date(2026, 10, 20, 9));
    cacheReading(reading);
    expect(getCachedReading(DEFAULT_CITY.id)?.city.id).toBe(DEFAULT_CITY.id);
    expect(getCachedReadingAge(DEFAULT_CITY.id)).toBe(reading.observedAt);
    expect(getCachedReading("missing")).toBeNull();
  });

  it("ignores malformed cache data", () => {
    store.set("saans.air-cache.v1", "{not json");
    expect(getCachedReading(DEFAULT_CITY.id)).toBeNull();
  });
});
