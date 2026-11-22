import { CITIES } from "./cities";
import { sampleReading } from "./sample-air";
import type { AirReading, City, CityDetail } from "./types";

/**
 * A deliberately transparent ranking universe. Open-Meteo does not provide a
 * ready-made "all India" ranking, so the dashboard ranks these major cities.
 */
export const INDIA_TRACKED_IDS = [
  "delhi",
  "mumbai",
  "kolkata",
  "chennai",
  "bengaluru",
  "hyderabad",
  "ahmedabad",
  "pune",
  "lucknow",
  "patna",
  "jaipur",
  "kanpur",
  "nagpur",
  "indore",
  "bhopal",
  "surat",
  "varanasi",
  "agra",
  "gurugram",
  "noida",
  "chandigarh",
  "amritsar",
  "meerut",
  "visakhapatnam",
] as const;

export const INDIA_TRACKED_CITIES: City[] = INDIA_TRACKED_IDS.flatMap((id) => {
  const city = CITIES.find((item) => item.id === id);
  return city ? [city] : [];
});

export function isIndianCity(city: City): boolean {
  return city.country.trim().toLowerCase() === "india";
}

export function isIndianGeocodeResult(result: {
  country?: string;
  country_code?: string;
}): boolean {
  return (
    result.country_code?.toUpperCase() === "IN" ||
    result.country?.trim().toLowerCase() === "india"
  );
}

/** Drops the hourly series when a screen only needs the summary card. */
export function toCityDetail(reading: AirReading): CityDetail {
  return {
    city: reading.city,
    observedAt: reading.observedAt,
    aqi: reading.aqi,
    category: reading.category,
    categoryLabel: reading.categoryLabel,
    source: reading.source,
    weather: reading.weather,
    pm25: reading.pm25,
    pm10: reading.pm10,
    co: reading.co,
    so2: reading.so2,
    no2: reading.no2,
    o3: reading.o3,
  };
}

/** Offline-safe ranking used before the live endpoint responds. */
export function sampleIndiaRanking(): CityDetail[] {
  return INDIA_TRACKED_CITIES.map((city) => toCityDetail(sampleReading(city))).sort(
    (a, b) => b.aqi - a.aqi,
  );
}
