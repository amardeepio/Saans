import type { AqiCategory, Household, Profile, RiskLevel } from "./types";

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

export interface AqiCategoryInfo {
  category: AqiCategory;
  label: string;
  shortLabel: string;
  advice: string;
  tone: "good" | "caution" | "warning" | "danger";
}

const CATEGORY_INFO: AqiCategoryInfo[] = [
  {
    category: "good",
    label: "Good",
    shortLabel: "Clear",
    advice: "Outdoor activity is generally fine for most people.",
    tone: "good",
  },
  {
    category: "moderate",
    label: "Moderate",
    shortLabel: "Hazy",
    advice: "Sensitive groups should watch longer or harder outdoor activity.",
    tone: "caution",
  },
  {
    category: "sensitive",
    label: "Unhealthy for sensitive groups",
    shortLabel: "Sensitive",
    advice: "Children, older adults and people with heart or lung conditions should reduce prolonged outdoor exertion.",
    tone: "caution",
  },
  {
    category: "unhealthy",
    label: "Unhealthy",
    shortLabel: "Unhealthy",
    advice: "Everyone should reduce prolonged outdoor exertion. Sensitive groups should stay indoors where possible.",
    tone: "warning",
  },
  {
    category: "very-unhealthy",
    label: "Very unhealthy",
    shortLabel: "Very poor",
    advice: "Avoid outdoor exertion. Keep windows closed and create a cleaner room indoors.",
    tone: "danger",
  },
  {
    category: "hazardous",
    label: "Hazardous",
    shortLabel: "Hazardous",
    advice: "Stay indoors with filtered air. Essential outdoor trips should be short and well protected.",
    tone: "danger",
  },
];

export function pm25ToAqi(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  const value = Math.min(pm25, 500.4);

  for (const bp of PM25_BREAKPOINTS) {
    if (value <= bp.cHigh) {
      const aqi =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (value - bp.cLow) + bp.iLow;
      return Math.max(0, Math.round(aqi));
    }
  }

  return 500;
}

export function aqiToPm25(aqi: number): number {
  const value = Math.max(0, Math.min(aqi, 500));
  for (const bp of PM25_BREAKPOINTS) {
    if (value <= bp.iHigh) {
      const pm =
        ((bp.cHigh - bp.cLow) / (bp.iHigh - bp.iLow)) * (value - bp.iLow) +
        bp.cLow;
      return Math.round(pm * 10) / 10;
    }
  }
  return 500.4;
}

export function aqiCategory(aqi: number): AqiCategoryInfo {
  if (aqi <= 50) return CATEGORY_INFO[0];
  if (aqi <= 100) return CATEGORY_INFO[1];
  if (aqi <= 150) return CATEGORY_INFO[2];
  if (aqi <= 200) return CATEGORY_INFO[3];
  if (aqi <= 300) return CATEGORY_INFO[4];
  return CATEGORY_INFO[5];
}

export function categoryForAqi(aqi: number): AqiCategory {
  return aqiCategory(aqi).category;
}

export function sensitiveGroups(household: Household): string[] {
  const groups: string[] = [];
  if (household.children > 0) {
    groups.push(household.children === 1 ? "child" : "children");
  }
  if (household.elders > 0) {
    groups.push(household.elders === 1 ? "older adult" : "older adults");
  }
  if (household.respiratory) groups.push("someone with a respiratory condition");
  if (household.pregnant) groups.push("a pregnant family member");
  return groups;
}

export function vulnerabilityScore(household: Household): number {
  return (
    household.children * 1 +
    household.elders * 1.2 +
    (household.respiratory ? 2.5 : 0) +
    (household.pregnant ? 1.5 : 0)
  );
}

export function riskFor(aqi: number, household: Household): RiskLevel {
  const sensitive = vulnerabilityScore(household) > 0;
  if (aqi <= 50) return "low";
  if (aqi <= 100) return sensitive ? "elevated" : "low";
  if (aqi <= 150) return sensitive ? "high" : "elevated";
  if (aqi <= 200) return "high";
  if (aqi <= 300) return "severe";
  return "critical";
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low concern",
  elevated: "Watchful",
  high: "Protect today",
  severe: "Severe",
  critical: "Critical",
};

export function riskSentence(risk: RiskLevel, hasSensitive: boolean): string {
  switch (risk) {
    case "low":
      return "A relatively clear day. Keep the good habits that keep indoor air cleaner.";
    case "elevated":
      return hasSensitive
        ? "Most people can carry on, but your sensitive family members need a little extra care."
        : "Most people can carry on, with a few sensible adjustments.";
    case "high":
      return hasSensitive
        ? "Treat today as a protect-the-household day, especially for children, older adults and anyone with a lung or heart condition."
        : "Reduce prolonged outdoor exertion and keep the indoor air cleaner.";
    case "severe":
      return "Limit outdoor time and make one room a genuinely cleaner space to retreat to.";
    case "critical":
      return "This is a stay-in day where possible. Keep essential trips short, protected and away from traffic.";
  }
}

export function aqiBandLabel(aqi: number): string {
  return `${aqi} · ${aqiCategory(aqi).label}`;
}

export function maskGuidance(aqi: number): string {
  if (aqi <= 50) return "No mask needed for most people.";
  if (aqi <= 100) return "A well-fitted mask is optional; useful on busy roads.";
  if (aqi <= 200) return "Use a well-fitted N95/FFP2 for sustained outdoor time.";
  return "Use a well-fitted N95/FFP2 for any essential outdoor trip.";
}

export function exposureWeight(profile: Profile): number {
  return Math.min(2.2, 1 + vulnerabilityScore(profile.household) * 0.12);
}
