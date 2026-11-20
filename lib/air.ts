import { aqiCategory, pm25ToAqi } from "./aqi";
import { nextHours, sampleReading } from "./sample-air";
import type { AirReading, City, HourlyAir } from "./types";

const OPEN_METEO_AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";
const REQUEST_TIMEOUT_MS = 6_500;

interface OpenMeteoAirResponse {
  current?: {
    time?: string;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
    us_aqi?: number | null;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numbers(values: Array<number | null> | undefined): number[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => asNumber(value, 0));
}

/**
 * Fetch current + 24h air quality from Open-Meteo. The public API needs no key.
 * Any upstream failure returns an explicitly-labelled sample rather than
 * leaving the interface empty.
 */
export async function getAirReading(city: City): Promise<AirReading> {
  const url = new URL(OPEN_METEO_AIR);
  url.searchParams.set("latitude", city.latitude.toFixed(4));
  url.searchParams.set("longitude", city.longitude.toFixed(4));
  url.searchParams.set("current", "pm2_5,pm10,nitrogen_dioxide,ozone,us_aqi");
  url.searchParams.set("hourly", "pm2_5,us_aqi");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 900 },
    });

    if (!response.ok) throw new Error(`Air service returned ${response.status}`);

    const data = (await response.json()) as OpenMeteoAirResponse;
    const current = data.current;
    if (!current) throw new Error("Air service returned no current reading");

    const fallbackPm25 = numbers(data.hourly?.pm2_5)[0] ?? 0;
    const pm25 = Math.max(0, asNumber(current.pm2_5, fallbackPm25));
    const reportedAqi = asNumber(current.us_aqi, 0);
    const aqi = reportedAqi > 0 ? Math.round(reportedAqi) : pm25ToAqi(pm25);

    const times = data.hourly?.time ?? [];
    const pm25Values = numbers(data.hourly?.pm2_5);
    const aqiValues = numbers(data.hourly?.us_aqi);
    const hourly: HourlyAir[] = times
      .map((time, index) => {
        const pointPm25 = Math.max(0, pm25Values[index] ?? 0);
        const pointAqi = aqiValues[index] > 0 ? aqiValues[index] : pm25ToAqi(pointPm25);
        return {
          time,
          aqi: Math.round(pointAqi),
          pm25: Math.round(pointPm25 * 10) / 10,
        };
      })
      .filter((point) => Number.isFinite(point.aqi));

    if (hourly.length < 6) throw new Error("Air service returned too few forecast hours");

    const category = aqiCategory(aqi);
    return {
      city,
      observedAt: current.time ?? new Date().toISOString(),
      aqi,
      pm25: Math.round(pm25 * 10) / 10,
      pm10: Math.round(asNumber(current.pm10, pm25 * 1.8) * 10) / 10,
      no2: Math.round(asNumber(current.nitrogen_dioxide) * 10) / 10,
      o3: Math.round(asNumber(current.ozone) * 10) / 10,
      category: category.category,
      categoryLabel: category.label,
      source: "open-meteo",
      hourly: nextHours(hourly, current.time),
    };
  } catch {
    return sampleReading(city);
  }
}

export function parseCoordinates(
  latitude: string | null,
  longitude: string | null,
): { latitude: number; longitude: number } | null {
  if (!latitude || !longitude) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}
