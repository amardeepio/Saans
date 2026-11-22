import { displayAqiFor } from "../measurement";
import type { Advice, AirReading, AqiStandard, OutdoorWindow } from "../types";

function blockLabel(time: string, hoursAhead: number): string {
  const match = time.match(/T(\d{2})/);
  const startHour = match ? Number(match[1]) : new Date(time).getHours();
  const endHour = (startHour + hoursAhead) % 24;
  const format = (hour: number) => {
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
  };
  return `${format(startHour)}–${format(endHour)}`;
}

function windowVerdict(aqi: number): OutdoorWindow["verdict"] {
  if (aqi <= 75) return "good";
  if (aqi <= 120) return "short";
  return "avoid";
}

function verdictDetail(verdict: OutdoorWindow["verdict"], sensitive: boolean): string {
  if (verdict === "good") {
    return sensitive
      ? "A reasonable window for a short outing. Keep outdoor play gentle."
      : "The cleanest stretch in the next 24 hours. Good for errands or a walk.";
  }
  if (verdict === "short") {
    return sensitive
      ? "Still hazy. Keep any outdoor time brief and avoid hard exertion."
      : "The least-hazy two-hour stretch. Keep outdoor time moderate.";
  }
  return "No clean outdoor window today. Keep essential trips short and protected.";
}

export function buildWindows(
  air: AirReading,
  sensitive: boolean,
  standard: AqiStandard,
): Advice["windows"] {
  const points = air.hourly.length >= 2 ? air.hourly : [{ ...air, time: air.observedAt }];
  let bestIndex = 0;
  let worstIndex = 0;
  let bestAverage = Number.POSITIVE_INFINITY;
  let worstAverage = Number.NEGATIVE_INFINITY;
  let bestDisplayAverage = Number.POSITIVE_INFINITY;
  let worstDisplayAverage = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < Math.max(1, points.length - 1); index += 1) {
    const first = points[index];
    const second = points[index + 1] ?? points[index];
    const average = (first.aqi + second.aqi) / 2;
    const displayAverage =
      (displayAqiFor(standard, first) + displayAqiFor(standard, second)) / 2;
    if (average < bestAverage) {
      bestAverage = average;
      bestDisplayAverage = displayAverage;
      bestIndex = index;
    }
    if (average > worstAverage) {
      worstAverage = average;
      worstDisplayAverage = displayAverage;
      worstIndex = index;
    }
  }

  const bestStart = points[bestIndex];
  const worstStart = points[worstIndex];
  const bestAqi = Math.round(bestAverage);
  const worstAqi = Math.round(worstAverage);
  const bestVerdict = windowVerdict(bestAqi);

  return {
    best: {
      start: bestStart.time,
      end: points[bestIndex + 2]?.time ?? bestStart.time,
      label: blockLabel(bestStart.time, 2),
      aqi: bestAqi,
      displayAqi: Math.round(bestDisplayAverage),
      verdict: bestVerdict,
      detail: verdictDetail(bestVerdict, sensitive),
    },
    worst: {
      start: worstStart.time,
      end: points[worstIndex + 2]?.time ?? worstStart.time,
      label: blockLabel(worstStart.time, 2),
      aqi: worstAqi,
      displayAqi: Math.round(worstDisplayAverage),
      verdict: windowVerdict(worstAqi),
      detail:
        worstAqi <= 100
          ? "Air is relatively even today; traffic peaks still make this the busiest window."
          : "This is the dirtiest two-hour stretch. Move errands and exercise out of it.",
    },
  };
}
