import { aqiCategory } from "./aqi";
import { grapForNaqi, isNcrCity, naqiFromReadings, pollutantSubIndex } from "./naqi";
import type { AqiMeasurement, AqiStandard, CityDetail } from "./types";

export type MeasurementInput = Pick<
  CityDetail,
  "city" | "aqi" | "pm25" | "pm10" | "co" | "so2" | "no2" | "o3"
>;

export function measurementFor(
  standard: AqiStandard,
  reading: MeasurementInput,
): AqiMeasurement {
  const naqi = naqiFromReadings(reading);
  const grap = isNcrCity(reading.city) ? grapForNaqi(naqi.value) : null;

  if (standard === "naqi") {
    return {
      standard,
      value: naqi.value,
      scaleLabel: "Indian NAQI",
      category: naqi.category,
      label: naqi.label,
      shortLabel: naqi.shortLabel,
      advice: naqi.advice,
      tone: naqi.tone,
      dominantPollutant: naqi.dominantPollutant ?? undefined,
      grap,
      estimated: true,
    };
  }

  const category = aqiCategory(reading.aqi);
  return {
    standard,
    value: reading.aqi,
    scaleLabel: "US AQI",
    category: category.category,
    label: category.label,
    shortLabel: category.shortLabel,
    advice: category.advice,
    tone: category.tone,
    dominantPollutant: naqi.dominantPollutant ?? undefined,
    grap,
    estimated: false,
  };
}

/** Convert a raw US AQI point into the active display scale. */
export function displayAqiFor(
  standard: AqiStandard,
  point: { aqi: number; pm25: number; pm10?: number },
): number {
  if (standard === "us") return point.aqi;
  const pm25 = Math.max(0, point.pm25);
  const pm25Index = pollutantSubIndex("pm25", pm25);
  const pm10Index = point.pm10 ? pollutantSubIndex("pm10", point.pm10) : 0;
  return Math.max(pm25Index, pm10Index);
}

export function dominantPollutantLabel(key?: string): string {
  switch (key) {
    case "pm25":
      return "PM₂.₅";
    case "pm10":
      return "PM₁₀";
    case "co":
      return "CO";
    case "so2":
      return "SO₂";
    case "no2":
      return "NO₂";
    case "o3":
      return "O₃";
    default:
      return "—";
  }
}
