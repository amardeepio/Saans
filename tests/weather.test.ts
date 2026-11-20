import { describe, expect, it } from "vitest";
import { DEFAULT_CITY } from "@/lib/cities";
import { sampleWeather, weatherLabel } from "@/lib/weather";

describe("weather snapshot", () => {
  it("maps WMO codes to plain-language labels", () => {
    expect(weatherLabel(0)).toBe("Clear");
    expect(weatherLabel(3)).toBe("Overcast");
    expect(weatherLabel(45)).toBe("Fog");
    expect(weatherLabel(63)).toBe("Rain");
    expect(weatherLabel(95)).toBe("Thunderstorm");
    expect(weatherLabel(999)).toBe("Hazy");
  });

  it("produces a deterministic, in-range sample in Celsius", () => {
    const now = new Date("2026-01-12T08:00:00.000Z");
    const first = sampleWeather(DEFAULT_CITY, now);
    const second = sampleWeather(DEFAULT_CITY, now);

    expect(first).toEqual(second);
    expect(first.source).toBe("sample");
    expect(first.temperatureC).toBeGreaterThan(-20);
    expect(first.temperatureC).toBeLessThan(50);
    expect(first.humidity).toBeGreaterThanOrEqual(0);
    expect(first.humidity).toBeLessThanOrEqual(100);
    expect(first.label.length).toBeGreaterThan(0);
  });
});
