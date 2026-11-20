import { describe, expect, it } from "vitest";
import { isIndianCity, isIndianGeocodeResult, INDIA_TRACKED_CITIES, INDIA_TRACKED_IDS } from "@/lib/india";

describe("India tracked-city universe", () => {
  it("contains a unique, resolvable set of 24 cities", () => {
    expect(INDIA_TRACKED_IDS.length).toBe(24);
    expect(INDIA_TRACKED_CITIES.length).toBe(24);
    expect(new Set(INDIA_TRACKED_IDS).size).toBe(24);
    expect(INDIA_TRACKED_CITIES.every(isIndianCity)).toBe(true);
  });

  it("filters geocoder results to India", () => {
    expect(isIndianGeocodeResult({ country: "India" })).toBe(true);
    expect(isIndianGeocodeResult({ country_code: "in" })).toBe(true);
    expect(isIndianGeocodeResult({ country: "Pakistan", country_code: "PK" })).toBe(false);
    expect(isIndianGeocodeResult({})).toBe(false);
  });
});
