import { describe, expect, it } from "vitest";
import {
  describeAtmosphere,
  dispersionLabel,
  dispersionScore,
  findVentilationWindow,
  inversionRiskFor,
} from "@/lib/dispersion";
import type { HourlyAir, WeatherSnapshot } from "@/lib/types";

const WEATHER: WeatherSnapshot = {
  temperatureC: 12,
  apparentTemperatureC: 11,
  humidity: 88,
  windKph: 4,
  code: 45,
  label: "Fog",
  source: "open-meteo",
};

const HOURLY: HourlyAir[] = Array.from({ length: 24 }, (_, index) => ({
  time: `2026-11-20T${String(index).padStart(2, "0")}:00`,
  aqi: index < 12 ? 280 : 90,
  pm25: index < 12 ? 180 : 30,
  windKph: index < 12 ? 3 : 18,
  precipMm: index === 15 ? 2 : 0,
}));

describe("dispersion model", () => {
  it("scores still, humid, cold air as poor dispersion", () => {
    const score = dispersionScore({
      windKph: 3,
      humidity: 92,
      temperatureC: 9,
      boundaryLayerM: 150,
    });
    expect(score).toBeGreaterThan(60);
    expect(dispersionLabel(score)).toBe("Poor");
    expect(inversionRiskFor(score, WEATHER)).toBe("high");
  });

  it("scores windy, dry air as good dispersion", () => {
    const score = dispersionScore({
      windKph: 24,
      humidity: 30,
      temperatureC: 27,
      boundaryLayerM: 1400,
    });
    expect(score).toBeLessThan(40);
    expect(dispersionLabel(score)).toBe("Good");
  });

  it("uses rain as a washout signal", () => {
    const dry = dispersionScore({ windKph: 8, humidity: 70, temperatureC: 20 });
    const wet = dispersionScore({
      windKph: 8,
      humidity: 70,
      temperatureC: 20,
      precipMm: 2,
    });
    expect(wet).toBeLessThan(dry);
  });

  it("finds a cleaner, breezier ventilation window", () => {
    const window = findVentilationWindow(HOURLY);
    expect(window).not.toBeNull();
    expect(window?.label).toMatch(/PM/);
  });

  it("describes the atmosphere with actionable guidance", () => {
    const atmosphere = describeAtmosphere(WEATHER, HOURLY);
    expect(atmosphere.dispersionLabel).toBe("Poor");
    expect(atmosphere.note.length).toBeGreaterThan(20);
    expect(atmosphere.ventilationAdvice.toLowerCase()).toContain("window");
  });
});
