export type Budget = "lean" | "balanced" | "comfortable";
export type Priority = "health" | "planet" | "cost" | "comfort";
export type CookingFuel = "lpg" | "piped-gas" | "electric" | "biomass";
export type Ventilation = "cross" | "single" | "sealed";
export type PurifierCount = "none" | "one" | "multiple";
export type IndoorSmoke = "none" | "incense" | "coal" | "wood";
export type PrimaryMobility = "walk" | "cycle" | "two-wheeler" | "car" | "bus" | "metro";
export type HomeType = "apartment" | "independent" | "shared";
export type FloorLevel = "ground" | "low" | "high";

export interface City {
  id: string;
  name: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface Household {
  adults: number;
  children: number;
  elders: number;
  respiratory: boolean;
  pregnant: boolean;
  pets: boolean;
}

export interface Home {
  type: HomeType;
  floor: FloorLevel;
  cookingFuel: CookingFuel;
  ventilation: Ventilation;
  purifier: PurifierCount;
  indoorSmoke: IndoorSmoke;
}

export interface Mobility {
  primary: PrimaryMobility;
  commuteMinutes: number;
  schoolRun: boolean;
  workFromHomeDays: number;
}

export interface Profile {
  displayName: string;
  city: City;
  household: Household;
  home: Home;
  mobility: Mobility;
  budget: Budget;
  priorities: Priority[];
  updatedAt?: string;
}

export type AqiCategory =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export type RiskLevel = "low" | "elevated" | "high" | "severe" | "critical";

export interface HourlyAir {
  time: string;
  aqi: number;
  pm25: number;
}

export interface AirReading {
  city: City;
  observedAt: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  category: AqiCategory;
  categoryLabel: string;
  source: "open-meteo" | "sample";
  hourly: HourlyAir[];
}

export type ActionCategory =
  | "health"
  | "home"
  | "mobility"
  | "sustainability"
  | "community";

export type TimeSlot = "morning" | "midday" | "evening" | "night";
export type Effort = "easy" | "medium" | "commitment";
export type PriorityLevel = "now" | "today" | "this-week";

export interface ActionImpact {
  /** Estimated share of the household's daily PM2.5 exposure reduced. */
  exposurePct: number;
  /** Estimated CO2e avoided per month, in kg. */
  co2eKgMonth: number;
  /** Estimated rupees saved per month. Negative values are a cost. */
  costInrMonth: number;
}

export interface PlanAction {
  id: string;
  title: string;
  slot: TimeSlot;
  timeLabel: string;
  category: ActionCategory;
  categoryLabel: string;
  priority: PriorityLevel;
  summary: string;
  steps: string[];
  why: string;
  effort: Effort;
  impact: ActionImpact;
  tags: string[];
  score: number;
}

export interface OutdoorWindow {
  start: string;
  end: string;
  label: string;
  aqi: number;
  verdict: "good" | "short" | "avoid";
  detail: string;
}

export interface Swap {
  id: string;
  title: string;
  description: string;
  impact: string;
  cost: string;
  co2eKgMonth: number;
  exposurePct: number;
  fit: "best-fit" | "good-fit";
}

export interface Ledger {
  exposurePct: number;
  co2eKgMonth: number;
  costInrMonth: number;
  actionsCount: number;
}

export interface Advice {
  risk: RiskLevel;
  riskLabel: string;
  headline: string;
  summary: string;
  alert: string | null;
  actions: PlanAction[];
  topAction: PlanAction;
  windows: {
    best: OutdoorWindow;
    worst: OutdoorWindow;
  };
  ledger: Ledger;
  swaps: Swap[];
  contextNotes: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "local";
  createdAt: string;
}

export interface ChatResponse {
  answer: string;
  mode: "ai" | "local";
  suggestions: string[];
}
