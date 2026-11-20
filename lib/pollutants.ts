import type { PollutantReadings } from "./types";

export type PollutantKey = keyof PollutantReadings;

export interface PollutantInfo {
  key: PollutantKey;
  label: string;
  formula: string;
  unit: string;
  accent: string;
  /** WHO 2021 guideline value in the display unit. */
  guideline: number;
  guidelineLabel: string;
  note: string;
  icon: "particles" | "gas" | "traffic" | "sun";
}

export const POLLUTANTS: PollutantInfo[] = [
  {
    key: "pm25",
    label: "Particulate Matter",
    formula: "PM₂.₅",
    unit: "µg/m³",
    accent: "#b28cf5",
    guideline: 15,
    guidelineLabel: "WHO 24h",
    note: "Fine particles that reach deep into the lungs.",
    icon: "particles",
  },
  {
    key: "pm10",
    label: "Particulate Matter",
    formula: "PM₁₀",
    unit: "µg/m³",
    accent: "#e59a4a",
    guideline: 45,
    guidelineLabel: "WHO 24h",
    note: "Dust and smoke that irritate eyes and airways.",
    icon: "particles",
  },
  {
    key: "co",
    label: "Carbon Monoxide",
    formula: "CO",
    unit: "mg/m³",
    accent: "#58c47a",
    guideline: 4,
    guidelineLabel: "WHO 24h",
    note: "Odourless gas from traffic, generators and burning.",
    icon: "gas",
  },
  {
    key: "so2",
    label: "Sulphur Dioxide",
    formula: "SO₂",
    unit: "µg/m³",
    accent: "#e8cc55",
    guideline: 40,
    guidelineLabel: "WHO 24h",
    note: "Fuel burning can irritate the nose and throat.",
    icon: "gas",
  },
  {
    key: "no2",
    label: "Nitrogen Dioxide",
    formula: "NO₂",
    unit: "µg/m³",
    accent: "#5ba7d4",
    guideline: 25,
    guidelineLabel: "WHO 24h",
    note: "Traffic and gas cooking can aggravate airways.",
    icon: "traffic",
  },
  {
    key: "o3",
    label: "Ozone",
    formula: "O₃",
    unit: "µg/m³",
    accent: "#b7db53",
    guideline: 100,
    guidelineLabel: "WHO 8h",
    note: "Can peak on sunny afternoons downwind of traffic.",
    icon: "sun",
  },
];

export function pollutantDisplayValue(
  pollutant: PollutantInfo,
  readings: PollutantReadings,
): number {
  const raw = readings[pollutant.key];
  return pollutant.key === "co" ? raw / 1_000 : raw;
}

export function pollutantGuidelineText(
  pollutant: PollutantInfo,
  readings: PollutantReadings,
): string {
  const value = pollutantDisplayValue(pollutant, readings);
  if (value <= 0) return "No reading";
  const ratio = value / pollutant.guideline;
  if (ratio <= 1) return "Within WHO guideline";
  return `${ratio.toFixed(ratio >= 10 ? 0 : 1)}× WHO guideline`;
}
