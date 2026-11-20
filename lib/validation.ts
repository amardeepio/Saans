import { aqiCategory } from "./aqi";
import { DEFAULT_PROFILE } from "./cities";
import type {
  AirReading,
  Budget,
  City,
  CookingFuel,
  FloorLevel,
  HomeType,
  Household,
  IndoorSmoke,
  Mobility,
  PrimaryMobility,
  Priority,
  Profile,
  PurifierCount,
  Ventilation,
} from "./types";

const BUDGETS: Budget[] = ["lean", "balanced", "comfortable"];
const PRIORITIES: Priority[] = ["health", "planet", "cost", "comfort"];
const COOKING: CookingFuel[] = ["lpg", "piped-gas", "electric", "biomass"];
const VENTILATION: Ventilation[] = ["cross", "single", "sealed"];
const PURIFIERS: PurifierCount[] = ["none", "one", "multiple"];
const SMOKE: IndoorSmoke[] = ["none", "incense", "coal", "wood"];
const MOBILITY: PrimaryMobility[] = ["walk", "cycle", "two-wheeler", "car", "bus", "metro"];
const HOME_TYPES: HomeType[] = ["apartment", "independent", "shared"];
const FLOORS: FloorLevel[] = ["ground", "low", "high"];

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function oneOf<T extends string>(value: unknown, values: T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function text(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : fallback;
}

export function sanitiseCity(value: unknown, fallback: City = DEFAULT_PROFILE.city): City {
  const input = object(value);
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const safeLat = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    ? latitude
    : fallback.latitude;
  const safeLon = Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? longitude
    : fallback.longitude;

  return {
    id: text(input.id, fallback.id, 60),
    name: text(input.name, fallback.name, 80),
    region: text(input.region, fallback.region ?? "", 80) || undefined,
    country: text(input.country, fallback.country, 80),
    latitude: Math.round(safeLat * 10000) / 10000,
    longitude: Math.round(safeLon * 10000) / 10000,
  };
}

export function sanitiseProfile(value: unknown): Profile {
  const input = object(value);
  const fallback = DEFAULT_PROFILE;
  const householdInput = object(input.household);
  const homeInput = object(input.home);
  const mobilityInput = object(input.mobility);
  const rawPriorities = Array.isArray(input.priorities) ? input.priorities : fallback.priorities;
  const priorities = Array.from(
    new Set(
      rawPriorities.filter(
        (item): item is Priority =>
          typeof item === "string" && PRIORITIES.includes(item as Priority),
      ),
    ),
  ).slice(0, 4);

  const household: Household = {
    adults: int(householdInput.adults, fallback.household.adults, 1, 12),
    children: int(householdInput.children, fallback.household.children, 0, 12),
    elders: int(householdInput.elders, fallback.household.elders, 0, 8),
    respiratory: bool(householdInput.respiratory, fallback.household.respiratory),
    pregnant: bool(householdInput.pregnant, fallback.household.pregnant),
    pets: bool(householdInput.pets, fallback.household.pets),
  };

  const home = {
    type: oneOf(homeInput.type, HOME_TYPES, fallback.home.type),
    floor: oneOf(homeInput.floor, FLOORS, fallback.home.floor),
    cookingFuel: oneOf(homeInput.cookingFuel, COOKING, fallback.home.cookingFuel),
    ventilation: oneOf(homeInput.ventilation, VENTILATION, fallback.home.ventilation),
    purifier: oneOf(homeInput.purifier, PURIFIERS, fallback.home.purifier),
    indoorSmoke: oneOf(homeInput.indoorSmoke, SMOKE, fallback.home.indoorSmoke),
  };

  const mobility: Mobility = {
    primary: oneOf(mobilityInput.primary, MOBILITY, fallback.mobility.primary),
    commuteMinutes: int(mobilityInput.commuteMinutes, fallback.mobility.commuteMinutes, 0, 180),
    schoolRun: bool(mobilityInput.schoolRun, fallback.mobility.schoolRun),
    workFromHomeDays: int(mobilityInput.workFromHomeDays, fallback.mobility.workFromHomeDays, 0, 7),
  };

  return {
    displayName: text(input.displayName, fallback.displayName, 40),
    city: sanitiseCity(input.city, fallback.city),
    household,
    home,
    mobility,
    budget: oneOf(input.budget, BUDGETS, fallback.budget),
    priorities: priorities.length > 0 ? priorities : [...fallback.priorities],
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt.slice(0, 40) : undefined,
  };
}

export function sanitiseAirReading(value: unknown, profile: Profile): AirReading | null {
  const input = object(value);
  const aqi = int(input.aqi, -1, -1, 500);
  if (aqi < 0) return null;
  const pm25 = int(input.pm25, 0, 0, 2000);
  const categoryInfo = aqiCategory(aqi);
  const source = input.source === "open-meteo" ? "open-meteo" : "sample";
  const hourly = Array.isArray(input.hourly)
    ? input.hourly
        .slice(0, 48)
        .map((point) => {
          const item = object(point);
          return {
            time: text(item.time, new Date().toISOString(), 40),
            aqi: int(item.aqi, 0, 0, 500),
            pm25: int(item.pm25, 0, 0, 2000),
          };
        })
        .filter((point) => point.aqi > 0)
    : [];

  return {
    city: profile.city,
    observedAt: text(input.observedAt, new Date().toISOString(), 40),
    aqi,
    pm25,
    pm10: int(input.pm10, 0, 0, 3000),
    no2: int(input.no2, 0, 0, 2000),
    o3: int(input.o3, 0, 0, 2000),
    category: categoryInfo.category,
    categoryLabel: categoryInfo.label,
    source,
    hourly:
      hourly.length > 1
        ? hourly
        : [{ time: new Date().toISOString(), aqi, pm25 }],
  };
}

export function sanitiseChatText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 600) return null;
  return trimmed;
}

export const PROFILE_STORAGE_KEY = "saans.profile.v1";

export function serialiseProfile(profile: Profile): string {
  return JSON.stringify({ version: 1, profile });
}

export function deserialiseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || parsed.version !== 1 || !parsed.profile) return null;
    return sanitiseProfile(parsed.profile);
  } catch {
    return null;
  }
}
