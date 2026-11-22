import { describe, expect, it } from "vitest";
import { DEFAULT_CITY } from "@/lib/cities";
import {
  hourLabelFromIso,
  isSameAqiBand,
  nextHours,
  normalizeAqi,
  ringRange,
  sampleReading,
} from "@/lib/sample-air";

describe("sample air and display helpers", () => {
  const reading = sampleReading(DEFAULT_CITY, new Date(2026, 10, 20, 9));

  it("returns a deterministic, labelled winter reading", () => {
    expect(reading.source).toBe("sample");
    expect(reading.aqi).toBeGreaterThan(0);
    expect(reading.hourly.length).toBe(24);
    expect(reading.hourly[0].windKph).toBeTypeOf("number");
  });

  it("extracts the next 24 hours from a longer forecast", () => {
    const longer = [
      ...reading.hourly,
      ...reading.hourly.map((point) => ({ ...point, time: `${point.time}-next` })),
    ];
    expect(nextHours(longer).length).toBeLessThanOrEqual(24);
    expect(nextHours(reading.hourly).length).toBe(24);
  });

  it("formats hours and normalizes reported AQI", () => {
    expect(hourLabelFromIso("2026-11-20T14:00")).toBe("2 PM");
    expect(hourLabelFromIso("nonsense")).toBe("—");
    expect(normalizeAqi(40, 123)).toBe(123);
    expect(normalizeAqi(40)).toBeGreaterThan(0);
  });

  it("compares bands and ring ranges", () => {
    expect(isSameAqiBand(48, 30)).toBe(true);
    expect(ringRange(500).percent).toBe(100);
    expect(ringRange(0).percent).toBeGreaterThan(0);
  });
});
