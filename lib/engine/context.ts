import type {
  ActionCategory,
  AqiMeasurement,
  Atmosphere,
  Effort,
  OutdoorWindow,
  PlanAction,
  PriorityLevel,
  Profile,
  TimeSlot,
} from "../types";

export const SLOT_ORDER: Record<TimeSlot, number> = {
  morning: 0,
  midday: 1,
  evening: 2,
  night: 3,
};

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  health: "Health shield",
  home: "Indoor air",
  mobility: "Getting around",
  sustainability: "Cleaner choice",
  community: "Community",
};

export interface ActionInput {
  id: string;
  title: string;
  slot: TimeSlot;
  timeLabel: string;
  category: ActionCategory;
  priority: PriorityLevel;
  summary: string;
  steps: string[];
  why: string;
  effort: Effort;
  exposurePct: number;
  co2eKgMonth?: number;
  costInrMonth?: number;
  tags: string[];
  score?: number;
}

export interface AdviceContext {
  profile: Profile;
  measurement: AqiMeasurement;
  atmosphere: Atmosphere;
  windows: { best: OutdoorWindow; worst: OutdoorWindow };
  displayAqi: number;
  high: boolean;
  severe: boolean;
  commute: number;
  mask: string;
  bestWindow: string;
}

export function makeAction(input: ActionInput): PlanAction {
  const exposurePct = Math.max(0, Math.min(25, Math.round(input.exposurePct)));
  const co2eKgMonth = Math.max(0, Math.round((input.co2eKgMonth ?? 0) * 10) / 10);
  const costInrMonth = Math.round(input.costInrMonth ?? 0);
  const healthScore = exposurePct * 2.3;
  const planetScore = co2eKgMonth * 0.8;
  const moneyScore = Math.max(-10, Math.min(25, costInrMonth / 45));
  const score = input.score ?? healthScore + planetScore + moneyScore;

  return {
    ...input,
    categoryLabel: CATEGORY_LABELS[input.category],
    impact: { exposurePct, co2eKgMonth, costInrMonth },
    score: Math.round(score * 10) / 10,
  };
}

export function commuteKm(profile: Profile): number {
  const speed = profile.mobility.primary === "car" ? 24 : 19;
  return Math.max(2, (profile.mobility.commuteMinutes / 60) * speed);
}

export function commuteFootprint(profile: Profile): number {
  const km = commuteKm(profile);
  const factor = profile.mobility.primary === "car" ? 0.17 : 0.045;
  return km * factor * 2 * 20;
}

export function combinedExposure(actions: PlanAction[]): number {
  const remaining = actions.reduce(
    (product, action) => product * (1 - action.impact.exposurePct / 100),
    1,
  );
  // Actions overlap and compliance is never perfect, so the household-level
  // estimate is deliberately capped below what the individual numbers imply.
  return Math.min(45, Math.round((1 - remaining) * 100));
}
