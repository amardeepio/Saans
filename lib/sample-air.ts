import { aqiToPm25, aqiCategory, pm25ToAqi } from "./aqi";
import type { AirReading, City } from "./types";
import { sampleWeather } from "./weather";

const WINTER_BASELINES: Record<string, number> = {
  delhi: 286,
  lahore: 312,
  dhaka: 238,
  mumbai: 164,
  kolkata: 221,
  kathmandu: 198,
  bengaluru: 112,
  karachi: 176,
  islamabad: 205,
  patna: 258,
  lucknow: 244,
  hyderabad: 138,
  chennai: 104,
  ahmedabad: 181,
  pune: 132,
};

function hash(input: string): number {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

function hourCurve(hour: number): number {
  if (hour >= 5 && hour <= 9) return 1.18;
  if (hour >= 10 && hour <= 12) return 1.05;
  if (hour >= 13 && hour <= 16) return 0.82;
  if (hour >= 17 && hour <= 20) return 1.1;
  return 0.96;
}

function localHour(time: string): number | null {
  const match = time.match(/T(\d{2})/);
  if (match) return Number(match[1]);
  const parsed = new Date(time);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getHours();
}

export function hourLabelFromIso(time: string): string {
  const hour = localHour(time);
  if (hour === null) return "—";
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${suffix}`;
}

/**
 * A deterministic, clearly-labelled sample used when live air data is
 * unavailable. It mirrors a winter pollution curve; it is never presented
 * as a live reading.
 */
export function sampleReading(city: City, now = new Date()): AirReading {
  const baseline = WINTER_BASELINES[city.id] ?? 145;
  const hour = now.getHours();
  const drift = (hash(`${city.id}-${now.toISOString().slice(0, 10)}`) % 31) - 15;
  const currentAqi = Math.max(28, Math.round(baseline * hourCurve(hour) + drift));
  const hourly = Array.from({ length: 24 }, (_, index) => {
    const point = new Date(now);
    point.setMinutes(0, 0, 0);
    point.setHours(point.getHours() + index);
    const noise = (hash(`${city.id}-${point.toISOString().slice(0, 13)}`) % 23) - 11;
    const aqi = Math.max(
      18,
      Math.round(baseline * hourCurve(point.getHours()) + drift * 0.6 + noise),
    );
    return {
      time: point.toISOString(),
      aqi,
      pm25: aqiToPm25(aqi),
    };
  });

  hourly[0] = { ...hourly[0], aqi: currentAqi, pm25: aqiToPm25(currentAqi) };
  const category = aqiCategory(currentAqi);

  return {
    city,
    observedAt: now.toISOString(),
    aqi: currentAqi,
    pm25: aqiToPm25(currentAqi),
    pm10: Math.round(aqiToPm25(currentAqi) * 1.9 * 10) / 10,
    no2: Math.round((18 + (hash(city.id) % 45)) * 10) / 10,
    co: Math.round(380 + currentAqi * 4 + (hash(`${city.id}-co`) % 280)),
    so2: Math.round((6 + (hash(`${city.id}-so2`) % 26) + currentAqi * 0.12) * 10) / 10,
    o3: Math.round((22 + (hash(`${city.id}-ozone`) % 38)) * 10) / 10,
    category: category.category,
    categoryLabel: category.label,
    source: "sample",
    weather: sampleWeather(city, now),
    hourly,
  };
}

export function nextHours(hourly: AirReading["hourly"], currentTime?: string): AirReading["hourly"] {
  if (hourly.length <= 24) return hourly;
  const currentHour = currentTime ? localHour(currentTime) : null;
  if (currentHour === null) return hourly.slice(0, 24);
  const index = hourly.findIndex((point) => localHour(point.time) === currentHour);
  if (index < 0) return hourly.slice(0, 24);
  return hourly.slice(index, index + 24);
}

export function ringRange(aqi: number): { start: number; end: number; percent: number } {
  const max = 400;
  return {
    start: 0,
    end: max,
    percent: Math.min(100, Math.max(2, (aqi / max) * 100)),
  };
}

export function isSameAqiBand(aqi: number, other: number): boolean {
  return aqiCategory(aqi).category === aqiCategory(other).category;
}

export function normaliseAqi(pm25: number, reported?: number | null): number {
  if (typeof reported === "number" && Number.isFinite(reported) && reported > 0) {
    return Math.round(reported);
  }
  return pm25ToAqi(pm25);
}
