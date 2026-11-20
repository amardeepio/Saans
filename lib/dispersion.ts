import { hourLabelFromIso } from "./sample-air";
import type { Atmosphere, HourlyAir, WeatherSnapshot } from "./types";

interface DispersionInput {
  windKph: number;
  humidity: number;
  temperatureC: number;
  precipMm?: number;
  boundaryLayerM?: number;
}

/**
 * A deliberately simple, explainable dispersion score. It is a planning aid,
 * not a meteorological model: still, humid, cold air traps pollution near the
 * ground, while wind, rain and a deep boundary layer help clear it.
 */
export function dispersionScore(input: DispersionInput): number {
  let score = 55;

  if (input.windKph < 4) score += 30;
  else if (input.windKph < 8) score += 18;
  else if (input.windKph < 14) score += 5;
  else if (input.windKph < 22) score -= 10;
  else score -= 20;

  if (input.humidity >= 90) score += 15;
  else if (input.humidity >= 80) score += 9;
  else if (input.humidity <= 35) score -= 5;

  if (input.temperatureC <= 10) score += 10;
  else if (input.temperatureC <= 15) score += 5;

  const rain = input.precipMm ?? 0;
  if (rain >= 1) score -= 25;
  else if (rain >= 0.2) score -= 12;

  if (typeof input.boundaryLayerM === "number") {
    if (input.boundaryLayerM < 200) score += 22;
    else if (input.boundaryLayerM < 500) score += 10;
    else if (input.boundaryLayerM > 1200) score -= 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function dispersionLabel(score: number): Atmosphere["dispersionLabel"] {
  if (score >= 65) return "Poor";
  if (score >= 40) return "Moderate";
  return "Good";
}

export function inversionRiskFor(
  score: number,
  weather: Pick<WeatherSnapshot, "windKph" | "humidity" | "temperatureC">,
): Atmosphere["inversionRisk"] {
  if (score >= 70 && weather.windKph < 8 && weather.humidity >= 70) return "high";
  if (score >= 50) return "moderate";
  return "low";
}

export function describeAtmosphere(
  weather: WeatherSnapshot,
  hourly: HourlyAir[] = [],
): Atmosphere {
  const score = dispersionScore({
    windKph: weather.windKph,
    humidity: weather.humidity,
    temperatureC: weather.temperatureC,
  });
  const label = dispersionLabel(score);
  const inversionRisk = inversionRiskFor(score, weather);
  const bestVentilationWindow = findVentilationWindow(hourly);

  const note =
    label === "Poor"
      ? `Still, humid air is trapping pollution near the ground (${weather.windKph} km/h wind, ${weather.humidity}% humidity). Outdoor readings may stay high even when the sky looks clearer.`
      : label === "Good"
        ? `The air is mixing relatively well (${weather.windKph} km/h wind). This is a better day to air a room briefly.`
        : `Dispersion is moderate (${weather.windKph} km/h wind, ${weather.humidity}% humidity). Use the cleaner hours rather than assuming the air will clear.`;

  const ventilationAdvice =
    label === "Good"
      ? "Open opposite windows for 10–15 minutes during the cleanest, breeziest window. Close up before the evening peak."
      : label === "Poor"
        ? "Keep street-facing windows closed. If the room feels stale, air it briefly when the outdoor AQI is lower than the indoor reading, then close up."
        : "A short cross-breeze in the cleanest window is reasonable. Keep it under 15 minutes and close up before traffic peaks.";

  return {
    dispersionScore: score,
    dispersionLabel: label,
    inversionRisk,
    note,
    ventilationAdvice,
    bestVentilationWindow,
  };
}

/** Pick the two-hour block with the best combination of low AQI and useful wind. */
export function findVentilationWindow(
  hourly: HourlyAir[],
): Atmosphere["bestVentilationWindow"] {
  if (hourly.length < 2) return null;
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < hourly.length - 1; index += 1) {
    const first = hourly[index];
    const second = hourly[index + 1];
    const aqi = (first.aqi + second.aqi) / 2;
    const wind = ((first.windKph ?? 8) + (second.windKph ?? 8)) / 2;
    const rain = ((first.precipMm ?? 0) + (second.precipMm ?? 0)) / 2;
    // Lower is better: clean air first, then a breeze, then avoid rain.
    const score = aqi - Math.min(18, wind * 1.4) + (rain > 0.5 ? 35 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  const start = hourly[bestIndex];
  const end = hourly[bestIndex + 2] ?? hourly[bestIndex + 1] ?? start;
  return {
    start: start.time,
    end: end.time,
    label: `${hourLabelFromIso(start.time)}–${hourLabelFromIso(end.time)}`,
  };
}
