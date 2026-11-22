import { describe, expect, it } from "vitest";
import {
  isIndianCity,
  isIndianGeocodeResult,
  INDIA_TRACKED_CITIES,
  INDIA_TRACKED_IDS,
  sampleIndiaRanking,
  toCityDetail,
} from "@/lib/india";
import { sampleReading } from "@/lib/sample-air";
import { DEFAULT_CITY } from "@/lib/cities";

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

  it("drops the hourly series when building a city summary", () => {
    const reading = sampleReading(DEFAULT_CITY);
    const detail = toCityDetail(reading);
    expect("hourly" in detail).toBe(false);
    expect(detail.city.id).toBe(DEFAULT_CITY.id);
    expect(detail.aqi).toBe(reading.aqi);
    expect(detail.pm25).toBe(reading.pm25);
  });

  it("builds an AQI-descending offline ranking", () => {
    const ranking = sampleIndiaRanking();
    expect(ranking).toHaveLength(INDIA_TRACKED_IDS.length);
    for (let index = 1; index < ranking.length; index += 1) {
      expect(ranking[index - 1].aqi).toBeGreaterThanOrEqual(ranking[index].aqi);
    }
  });
});
