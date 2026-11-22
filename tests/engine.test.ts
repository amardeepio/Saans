import { describe, expect, it } from "vitest";
import { DEFAULT_CITY, DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { sampleReading } from "@/lib/sample-air";
import type { AirReading, Profile } from "@/lib/types";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    ...DEFAULT_PROFILE,
    city: DEFAULT_CITY,
    household: { ...DEFAULT_PROFILE.household },
    home: { ...DEFAULT_PROFILE.home },
    mobility: { ...DEFAULT_PROFILE.mobility },
    priorities: [...DEFAULT_PROFILE.priorities],
    ...overrides,
  };
}

const FIXED_DATE = new Date("2026-01-12T08:00:00.000Z");

describe("advice engine", () => {
  it("builds a complete, bounded plan from a live-shaped reading", () => {
    const air = sampleReading(DEFAULT_CITY, FIXED_DATE);
    const advice = buildAdvice(profile(), air);

    expect(advice.actions.length).toBeGreaterThanOrEqual(6);
    expect(advice.actions.length).toBeLessThanOrEqual(9);
    expect(advice.topAction.score).toBeGreaterThanOrEqual(advice.actions[0].score - 1);
    expect(advice.ledger.exposurePct).toBeGreaterThan(0);
    expect(advice.ledger.exposurePct).toBeLessThanOrEqual(45);
    expect(advice.ledger.co2eKgMonth).toBeGreaterThanOrEqual(0);
    expect(advice.windows.best.aqi).toBeLessThanOrEqual(advice.windows.worst.aqi);
    expect(advice.swaps.length).toBeGreaterThan(0);
    expect(advice.contextNotes.some((note) => note.includes("modelled"))).toBe(true);
  });

  it("orders the visible plan by time of day", () => {
    const advice = buildAdvice(profile(), sampleReading(DEFAULT_CITY, FIXED_DATE));
    const order = { morning: 0, midday: 1, evening: 2, night: 3 };
    const slots = advice.actions.map((action) => order[action.slot]);
    expect(slots).toEqual([...slots].sort((a, b) => a - b));
  });

  it("adds school-specific protection for a family with children", () => {
    const advice = buildAdvice(profile(), sampleReading(DEFAULT_CITY, FIXED_DATE));
    expect(advice.actions.some((action) => action.id === "school-shield")).toBe(true);
  });

  it("does not invent a school run for a household without children", () => {
    const p = profile({
      household: { adults: 2, children: 0, elders: 0, respiratory: false, pregnant: false, pets: false },
    });
    const advice = buildAdvice(p, sampleReading(DEFAULT_CITY, FIXED_DATE));
    expect(advice.actions.some((action) => action.id === "school-shield")).toBe(false);
  });

  it("prioritizes solid-fuel smoke in a biomass household", () => {
    const p = profile({
      home: { ...DEFAULT_PROFILE.home, cookingFuel: "biomass", indoorSmoke: "wood" },
    });
    const advice = buildAdvice(p, sampleReading(DEFAULT_CITY, FIXED_DATE));
    expect(advice.actions.some((action) => action.id === "clean-cooking")).toBe(true);
    expect(advice.actions.some((action) => action.id === "stop-indoor-burning")).toBe(true);
    expect(advice.topAction).toBeDefined();
  });

  it("recommends filtering a room only when a purifier is absent", () => {
    const without = buildAdvice(profile(), sampleReading(DEFAULT_CITY, FIXED_DATE));
    expect(without.actions.some((action) => action.id === "clean-room")).toBe(true);

    const withOne = buildAdvice(
      profile({ home: { ...DEFAULT_PROFILE.home, purifier: "one" } }),
      sampleReading(DEFAULT_CITY, FIXED_DATE),
    );
    expect(withOne.actions.some((action) => action.id === "clean-room")).toBe(false);
    expect(withOne.actions.some((action) => action.id === "purifier-tune")).toBe(true);
  });

  it("shows transit carbon savings for a car commuter", () => {
    const p = profile({
      mobility: { ...DEFAULT_PROFILE.mobility, primary: "car", commuteMinutes: 45, schoolRun: false },
    });
    const advice = buildAdvice(p, sampleReading(DEFAULT_CITY, FIXED_DATE));
    const swap = advice.swaps.find((item) => item.id === "one-transit-day");
    expect(swap).toBeDefined();
    expect(swap?.co2eKgMonth).toBeGreaterThan(0);
    expect(advice.actions.some((action) => action.id === "commute-swap")).toBe(true);
  });

  it("uses a labelled sample reading without pretending it is live", () => {
    const sample = sampleReading(DEFAULT_CITY, FIXED_DATE);
    const advice = buildAdvice(profile(), sample);
    expect(sample.source).toBe("sample");
    expect(advice.contextNotes[0]).toContain("sample");
  });

  it("keeps the plan sensible on a very clean day", () => {
    const clean: AirReading = {
      ...sampleReading(DEFAULT_CITY, FIXED_DATE),
      aqi: 28,
      category: "good",
      categoryLabel: "Good",
      hourly: Array.from({ length: 24 }, (_, index) => ({
        time: new Date(FIXED_DATE.getTime() + index * 3_600_000).toISOString(),
        aqi: 28 + (index % 3),
        pm25: 7,
      })),
    };
    const advice = buildAdvice(profile(), clean);
    expect(advice.risk).toBe("low");
    expect(advice.alert).toBeNull();
    expect(advice.windows.best.verdict).toBe("good");
  });
});
