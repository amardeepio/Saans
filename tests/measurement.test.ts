import { describe, expect, it } from "vitest";
import { displayAqiFor, dominantPollutantLabel, measurementFor } from "@/lib/measurement";
import type { CityDetail } from "@/lib/types";

const DELHI: CityDetail = {
  city: {
    id: "delhi",
    name: "Delhi",
    region: "NCT",
    country: "India",
    latitude: 28.6139,
    longitude: 77.209,
  },
  observedAt: "2026-11-20T09:00",
  aqi: 220,
  pm25: 160,
  pm10: 300,
  co: 1200,
  so2: 20,
  no2: 90,
  o3: 60,
  category: "very-unhealthy",
  categoryLabel: "Very unhealthy",
  source: "open-meteo",
  weather: {
    temperatureC: 15,
    apparentTemperatureC: 14,
    humidity: 80,
    windKph: 5,
    code: 45,
    label: "Fog",
    source: "open-meteo",
  },
};

describe("AQI measurement selector", () => {
  it("returns the provider US reading for the US scale", () => {
    const measurement = measurementFor("us", DELHI);
    expect(measurement.value).toBe(220);
    expect(measurement.scaleLabel).toBe("US AQI");
    expect(measurement.estimated).toBe(false);
    expect(measurement.grap).not.toBeNull();
  });

  it("computes an Indian NAQI reading from the pollutant mix", () => {
    const measurement = measurementFor("naqi", DELHI);
    expect(measurement.value).toBeGreaterThan(200);
    expect(measurement.scaleLabel).toBe("Indian NAQI");
    expect(measurement.estimated).toBe(true);
    expect(measurement.dominantPollutant).toBeDefined();
  });

  it("converts hourly points into the selected display scale", () => {
    expect(displayAqiFor("us", { aqi: 180, pm25: 90, pm10: 200 })).toBe(180);
    expect(displayAqiFor("naqi", { aqi: 180, pm25: 90, pm10: 200 })).toBe(200);
  });

  it("labels every supported dominant pollutant", () => {
    expect(dominantPollutantLabel("pm25")).toBe("PM₂.₅");
    expect(dominantPollutantLabel("pm10")).toBe("PM₁₀");
    expect(dominantPollutantLabel("co")).toBe("CO");
    expect(dominantPollutantLabel("so2")).toBe("SO₂");
    expect(dominantPollutantLabel("no2")).toBe("NO₂");
    expect(dominantPollutantLabel("o3")).toBe("O₃");
    expect(dominantPollutantLabel(undefined)).toBe("—");
  });
});
