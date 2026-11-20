import { CITIES } from "./cities";
import type { City } from "./types";

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
