import { aqiCategory, pm25ToAqi } from "./aqi";
import { nextHours, sampleReading } from "./sample-air";
import type { AirReading, City, CityDetail, HourlyAir, WeatherSnapshot } from "./types";
import { sampleWeather, weatherLabel } from "./weather";

const OPEN_METEO_AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 6_500;
const REVALIDATE_SECONDS = 900;

interface OpenMeteoAirCurrent {
  time?: string;
  pm2_5?: number | null;
  pm10?: number | null;
  carbon_monoxide?: number | null;
  sulphur_dioxide?: number | null;
  nitrogen_dioxide?: number | null;
  ozone?: number | null;
  us_aqi?: number | null;
}

interface OpenMeteoAirResponse {
  current?: OpenMeteoAirCurrent;
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  current?: {
    temperature_2m?: number | null;
    apparent_temperature?: number | null;
    relative_humidity_2m?: number | null;
    wind_speed_10m?: number | null;
    weather_code?: number | null;
  };
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function rounded(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function numbers(values: Array<number | null> | undefined): number[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => asNumber(value, 0));
}

function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function weatherFromCurrent(
  city: City,
  current: OpenMeteoWeatherResponse["current"],
): WeatherSnapshot {
  if (!current || typeof current.temperature_2m !== "number") return sampleWeather(city);
  const code = Math.round(asNumber(current.weather_code));
  return {
    temperatureC: rounded(asNumber(current.temperature_2m)),
    apparentTemperatureC: rounded(
      asNumber(current.apparent_temperature, current.temperature_2m),
    ),
    humidity: Math.round(asNumber(current.relative_humidity_2m, 50)),
    windKph: rounded(asNumber(current.wind_speed_10m)),
    code,
    label: weatherLabel(code),
    source: "open-meteo",
  };
}

async function fetchWeather(cities: City[]): Promise<WeatherSnapshot[]> {
  if (cities.length === 0) return [];
  const url = new URL(OPEN_METEO_WEATHER);
  url.searchParams.set("latitude", cities.map((city) => city.latitude.toFixed(4)).join(","));
  url.searchParams.set("longitude", cities.map((city) => city.longitude.toFixed(4)).join(","));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const data = asArray((await response.json()) as OpenMeteoWeatherResponse | OpenMeteoWeatherResponse[]);
    return cities.map((city, index) => weatherFromCurrent(city, data[index]?.current));
  } catch {
    return cities.map((city) => sampleWeather(city));
  }
}

function detailFromCurrent(
  city: City,
  current: OpenMeteoAirCurrent | undefined,
  weather: WeatherSnapshot,
): CityDetail {
  if (!current || typeof current.pm2_5 !== "number") {
    const sample = sampleReading(city);
    return { ...sample, weather };
  }

  const pm25 = Math.max(0, current.pm2_5);
  const reportedAqi = asNumber(current.us_aqi, 0);
  const aqi = reportedAqi > 0 ? Math.round(reportedAqi) : pm25ToAqi(pm25);
  const category = aqiCategory(aqi);

  return {
    city,
    observedAt: current.time ?? new Date().toISOString(),
    aqi,
    pm25: rounded(pm25),
    pm10: rounded(asNumber(current.pm10, pm25 * 1.8)),
    co: rounded(asNumber(current.carbon_monoxide)),
    so2: rounded(asNumber(current.sulphur_dioxide)),
    no2: rounded(asNumber(current.nitrogen_dioxide)),
    o3: rounded(asNumber(current.ozone)),
    category: category.category,
    categoryLabel: category.label,
    source: "open-meteo",
    weather,
  };
}

async function fetchAirBatch(cities: City[]): Promise<OpenMeteoAirResponse[]> {
  if (cities.length === 0) return [];
  const url = new URL(OPEN_METEO_AIR);
  url.searchParams.set("latitude", cities.map((city) => city.latitude.toFixed(4)).join(","));
  url.searchParams.set("longitude", cities.map((city) => city.longitude.toFixed(4)).join(","));
  url.searchParams.set(
    "current",
    "pm2_5,pm10,carbon_monoxide,sulphur_dioxide,nitrogen_dioxide,ozone,us_aqi",
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`Air service returned ${response.status}`);
  return asArray((await response.json()) as OpenMeteoAirResponse | OpenMeteoAirResponse[]);
}

/**
 * Fetch summary readings for several cities using Open-Meteo's multi-location
 * support. This is the efficient path used by the metro strip and the
 * dashboard ranking: two upstream calls for the entire list.
 */
export async function getCityDetails(cities: City[]): Promise<CityDetail[]> {
  if (cities.length === 0) return [];
  const [airResult, weatherResult] = await Promise.allSettled([
    fetchAirBatch(cities),
    fetchWeather(cities),
  ]);
  const air = airResult.status === "fulfilled" ? airResult.value : [];
  const weather =
    weatherResult.status === "fulfilled"
      ? weatherResult.value
      : cities.map((city) => sampleWeather(city));

  return cities.map((city, index) =>
    detailFromCurrent(city, air[index]?.current, weather[index] ?? sampleWeather(city)),
  );
}

/**
 * Fetch current + 24h air quality and current weather for one city. The public
 * API needs no key. Any upstream failure returns an explicitly-labelled sample
 * rather than leaving the interface empty.
 */
export async function getAirReading(city: City): Promise<AirReading> {
  const weatherPromise = fetchWeather([city]);
  const url = new URL(OPEN_METEO_AIR);
  url.searchParams.set("latitude", city.latitude.toFixed(4));
  url.searchParams.set("longitude", city.longitude.toFixed(4));
  url.searchParams.set(
    "current",
    "pm2_5,pm10,carbon_monoxide,sulphur_dioxide,nitrogen_dioxide,ozone,us_aqi",
  );
  url.searchParams.set("hourly", "pm2_5,us_aqi");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
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
          pm25: rounded(pointPm25),
        };
      })
      .filter((point) => Number.isFinite(point.aqi));

    if (hourly.length < 6) throw new Error("Air service returned too few forecast hours");

    const category = aqiCategory(aqi);
    const weatherList = await weatherPromise;
    return {
      city,
      observedAt: current.time ?? new Date().toISOString(),
      aqi,
      pm25: rounded(pm25),
      pm10: rounded(asNumber(current.pm10, pm25 * 1.8)),
      co: rounded(asNumber(current.carbon_monoxide)),
      so2: rounded(asNumber(current.sulphur_dioxide)),
      no2: rounded(asNumber(current.nitrogen_dioxide)),
      o3: rounded(asNumber(current.ozone)),
      category: category.category,
      categoryLabel: category.label,
      source: "open-meteo",
      weather: weatherList[0] ?? sampleWeather(city),
      hourly: nextHours(hourly, current.time),
    };
  } catch {
    const fallback = sampleReading(city);
    return { ...fallback, weather: (await weatherPromise)[0] ?? fallback.weather };
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
