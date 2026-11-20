import type { City, WeatherSnapshot } from "./types";

const BASE_TEMPERATURE: Record<string, number> = {
  delhi: 19,
  lahore: 17,
  dhaka: 24,
  mumbai: 30,
  kolkata: 24,
  kathmandu: 12,
  bengaluru: 25,
  karachi: 25,
  islamabad: 16,
  patna: 19,
  lucknow: 18,
  hyderabad: 27,
  ahmedabad: 26,
  chennai: 29,
  pune: 24,
};

const WEATHER_LABELS: Array<{ codes: number[]; label: string }> = [
  { codes: [0], label: "Clear" },
  { codes: [1, 2], label: "Partly cloudy" },
  { codes: [3], label: "Overcast" },
  { codes: [45, 48], label: "Fog" },
  { codes: [51, 53, 55, 56, 57], label: "Drizzle" },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: "Rain" },
  { codes: [71, 73, 75, 77, 85, 86], label: "Snow" },
  { codes: [95, 96, 99], label: "Thunderstorm" },
];

export function weatherLabel(code: number): string {
  return WEATHER_LABELS.find((entry) => entry.codes.includes(code))?.label ?? "Hazy";
}

function hash(input: string): number {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

/**
 * Deterministic sample weather for the offline fallback. Shaped like a
 * winter day, but never presented as live data.
 */
export function sampleWeather(city: City, now = new Date()): WeatherSnapshot {
  const base = BASE_TEMPERATURE[city.id] ?? 23;
  const hour = now.getHours();
  const diurnal = Math.cos(((hour - 15) / 24) * Math.PI * 2) * 4.2;
  const jitter = (hash(`${city.id}-${now.toISOString().slice(0, 13)}`) % 9) / 10 - 0.4;
  const temperature = Math.round((base + diurnal + jitter) * 10) / 10;
  const apparent = Math.round((temperature + (hash(`${city.id}-feels`) % 7) / 2 - 1.5) * 10) / 10;
  const humidity = 42 + (hash(`${city.id}-humidity`) % 40);
  const wind = Math.round((4 + (hash(`${city.id}-wind`) % 13)) * 10) / 10;
  const isCoastal = ["mumbai", "chennai", "kolkata", "karachi"].includes(city.id);
  const code = isCoastal ? 1 : city.id === "bengaluru" ? 2 : 45;

  return {
    temperatureC: temperature,
    apparentTemperatureC: apparent,
    humidity,
    windKph: wind,
    code,
    label: weatherLabel(code),
    source: "sample",
  };
}
