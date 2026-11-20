import type { City, GrapInfo, NaqiCategory, PollutantReadings } from "./types";

/**
 * Indian National Air Quality Index (NAQI) as published by the CPCB.
 *
 * The official index is built from 24-hour averages for most pollutants and
 * 8-hour averages for CO and O3. Saans usually has a current snapshot, so the
 * functions below are explicit about producing an estimate from the available
 * concentrations rather than a certified CPCB reading.
 */

type PollutantKey = keyof PollutantReadings;

interface Breakpoint {
  low: number;
  high: number;
  iLow: number;
  iHigh: number;
}

interface PollutantScale {
  key: PollutantKey;
  label: string;
  unit: string;
  /** Concentrations must be supplied in these units. */
  points: number[];
}

const INDEX_POINTS = [0, 50, 100, 200, 300, 400, 500];

function toBreakpoints(concentrations: number[]): Breakpoint[] {
  return concentrations.slice(0, -1).map((low, index) => ({
    low,
    high: concentrations[index + 1],
    iLow: INDEX_POINTS[index],
    iHigh: INDEX_POINTS[index + 1],
  }));
}

export const NAQI_SCALES: Record<PollutantKey, PollutantScale> = {
  // CPCB 24-hour PM2.5 breakpoints (µg/m³).
  pm25: {
    key: "pm25",
    label: "PM₂.₅",
    unit: "µg/m³",
    points: [0, 30, 60, 90, 120, 250, 500],
  },
  // CPCB 24-hour PM10 breakpoints (µg/m³).
  pm10: {
    key: "pm10",
    label: "PM₁₀",
    unit: "µg/m³",
    points: [0, 50, 100, 250, 350, 430, 600],
  },
  // CPCB 8-hour CO breakpoints, expressed here in mg/m³.
  co: {
    key: "co",
    label: "CO",
    unit: "mg/m³",
    points: [0, 1, 2, 10, 17, 34, 50],
  },
  // CPCB 24-hour SO2 breakpoints (µg/m³).
  so2: {
    key: "so2",
    label: "SO₂",
    unit: "µg/m³",
    points: [0, 40, 80, 380, 800, 1600, 2000],
  },
  // CPCB 24-hour NO2 breakpoints (µg/m³).
  no2: {
    key: "no2",
    label: "NO₂",
    unit: "µg/m³",
    points: [0, 40, 80, 180, 280, 400, 600],
  },
  // CPCB 8-hour O3 breakpoints (µg/m³).
  o3: {
    key: "o3",
    label: "O₃",
    unit: "µg/m³",
    points: [0, 50, 100, 168, 208, 748, 1000],
  },
};

const BREAKPOINTS: Record<PollutantKey, Breakpoint[]> = {
  pm25: toBreakpoints(NAQI_SCALES.pm25.points),
  pm10: toBreakpoints(NAQI_SCALES.pm10.points),
  co: toBreakpoints(NAQI_SCALES.co.points),
  so2: toBreakpoints(NAQI_SCALES.so2.points),
  no2: toBreakpoints(NAQI_SCALES.no2.points),
  o3: toBreakpoints(NAQI_SCALES.o3.points),
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convert a pollutant concentration into its CPCB sub-index. */
export function pollutantSubIndex(key: PollutantKey, concentration: number): number {
  const scale = NAQI_SCALES[key];
  if (!Number.isFinite(concentration) || concentration <= 0) return 0;
  const normalised = key === "co" ? concentration / 1000 : concentration;

  for (const bp of BREAKPOINTS[key]) {
    if (normalised <= bp.high) {
      const span = bp.high - bp.low;
      const ratio = span <= 0 ? 0 : clamp((normalised - bp.low) / span, 0, 1);
      return Math.round(bp.iLow + ratio * (bp.iHigh - bp.iLow));
    }
  }

  return scale.points.length > 0 ? 500 : 0;
}

export interface NaqiResult {
  value: number;
  category: NaqiCategory;
  label: string;
  shortLabel: string;
  advice: string;
  tone: "good" | "caution" | "warning" | "danger";
  dominantPollutant: PollutantKey | null;
  subIndices: Partial<Record<PollutantKey, number>>;
}

const NAQI_CATEGORY_INFO: Record<
  NaqiCategory,
  { label: string; shortLabel: string; advice: string; tone: NaqiResult["tone"] }
> = {
  good: {
    label: "Good",
    shortLabel: "Good",
    advice: "Air quality is satisfactory. Most people can carry on with normal outdoor activity.",
    tone: "good",
  },
  satisfactory: {
    label: "Satisfactory",
    shortLabel: "Satisfactory",
    advice:
      "Air quality is acceptable. Sensitive people may notice mild effects during prolonged outdoor exertion.",
    tone: "caution",
  },
  moderate: {
    label: "Moderate",
    shortLabel: "Moderate",
    advice:
      "Sensitive groups should reduce prolonged outdoor exertion. Children and older adults need extra care.",
    tone: "caution",
  },
  poor: {
    label: "Poor",
    shortLabel: "Poor",
    advice:
      "Everyone may begin to feel effects. Reduce prolonged outdoor exertion and keep indoor air cleaner.",
    tone: "warning",
  },
  "very-poor": {
    label: "Very Poor",
    shortLabel: "Very poor",
    advice:
      "Avoid outdoor exertion. Keep windows closed and create a cleaner room indoors.",
    tone: "danger",
  },
  severe: {
    label: "Severe",
    shortLabel: "Severe",
    advice:
      "Stay indoors with filtered air where possible. Essential trips should be short and well protected.",
    tone: "danger",
  },
};

export function naqiCategory(value: number): Omit<NaqiResult, "value" | "dominantPollutant" | "subIndices"> {
  const category: NaqiCategory =
    value <= 50
      ? "good"
      : value <= 100
        ? "satisfactory"
        : value <= 200
          ? "moderate"
          : value <= 300
            ? "poor"
            : value <= 400
              ? "very-poor"
              : "severe";
  return { category, ...NAQI_CATEGORY_INFO[category] };
}

/**
 * Build an indicative NAQI from the pollutant snapshot. The highest
 * sub-index decides the overall value, exactly as the CPCB method does.
 */
export function naqiFromReadings(readings: PollutantReadings): NaqiResult {
  const subIndices: Partial<Record<PollutantKey, number>> = {};
  let value = 0;
  let dominantPollutant: PollutantKey | null = null;

  (Object.keys(NAQI_SCALES) as PollutantKey[]).forEach((key) => {
    const subIndex = pollutantSubIndex(key, readings[key]);
    if (subIndex <= 0) return;
    subIndices[key] = subIndex;
    if (subIndex > value) {
      value = subIndex;
      dominantPollutant = key;
    }
  });

  const category = naqiCategory(value);
  return { value, ...category, dominantPollutant, subIndices };
}

export function naqiFromHourlyPoint(point: {
  pm25: number;
  pm10?: number;
}): number {
  const pm25 = pollutantSubIndex("pm25", point.pm25);
  const pm10 = point.pm10 ? pollutantSubIndex("pm10", point.pm10) : 0;
  return Math.max(pm25, pm10);
}

/** Approximate Delhi-NCR boundary used for GRAP context. */
const NCR_IDS = new Set([
  "delhi",
  "gurugram",
  "noida",
  "ghaziabad",
  "faridabad",
  "greater-noida",
  "sonipat",
  "rohtak",
]);

const NCR_NAMES = new Set([
  "delhi",
  "new delhi",
  "gurugram",
  "gurgaon",
  "noida",
  "greater noida",
  "ghaziabad",
  "faridabad",
  "sonipat",
  "rohtak",
]);

export function isNcrCity(city: City): boolean {
  if (NCR_IDS.has(city.id.toLowerCase())) return true;
  if (NCR_NAMES.has(city.name.trim().toLowerCase())) return true;
  return (
    city.latitude >= 28.0 &&
    city.latitude <= 29.2 &&
    city.longitude >= 76.7 &&
    city.longitude <= 77.6
  );
}

const GRAP_STAGES: Array<{
  stage: 1 | 2 | 3 | 4;
  min: number;
  max: number;
  label: string;
  summary: string;
  actions: string[];
}> = [
  {
    stage: 1,
    min: 201,
    max: 300,
    label: "Stage I · Poor",
    summary:
      "At this NAQI, Delhi-NCR conditions are consistent with GRAP Stage I. Check CAQM for the official order.",
    actions: [
      "Mechanised road sweeping and water sprinkling on dust-prone stretches.",
      "Strict dust control at construction and demolition sites.",
      "No open burning of leaves, waste or plastic.",
    ],
  },
  {
    stage: 2,
    min: 301,
    max: 400,
    label: "Stage II · Very Poor",
    summary:
      "At this NAQI, Delhi-NCR conditions are consistent with GRAP Stage II. Check CAQM for the official order.",
    actions: [
      "Stop open burning and restrict coal or diesel generator use.",
      "Increase public transport and parking fees in hot spots.",
      "Step up dust control and mechanised sweeping.",
    ],
  },
  {
    stage: 3,
    min: 401,
    max: 450,
    label: "Stage III · Severe",
    summary:
      "At this NAQI, Delhi-NCR conditions are consistent with GRAP Stage III. Check CAQM for the official order.",
    actions: [
      "Pause non-essential construction and demolition.",
      "Restrict diesel generators and intensify water sprinkling.",
      "Use public transport and avoid unnecessary private trips.",
    ],
  },
  {
    stage: 4,
    min: 451,
    max: Number.POSITIVE_INFINITY,
    label: "Stage IV · Severe Plus",
    summary:
      "At this NAQI, Delhi-NCR conditions are consistent with GRAP Stage IV. Check CAQM for the official order and school guidance.",
    actions: [
      "Expect truck-entry restrictions and possible odd-even measures.",
      "Follow official school closure or shift guidance.",
      "Keep children, older adults and vulnerable people indoors.",
    ],
  },
];

export function grapForNaqi(value: number): GrapInfo | null {
  if (value < 201) return null;
  const stage = GRAP_STAGES.find((item) => value >= item.min && value <= item.max);
  if (!stage) return null;
  return {
    stage: stage.stage,
    label: stage.label,
    range: stage.stage === 4 ? "NAQI 451+" : `NAQI ${stage.min}–${stage.max}`,
    summary: stage.summary,
    actions: stage.actions,
    official: false,
  };
}

export function naqiScaleLabel(): string {
  return "Indian NAQI";
}

export function naqiCategoryLabel(value: number): string {
  return naqiCategory(value).label;
}
