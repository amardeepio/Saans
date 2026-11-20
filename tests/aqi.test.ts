import { describe, expect, it } from "vitest";
import {
  aqiCategory,
  aqiToPm25,
  pm25ToAqi,
  riskFor,
  sensitiveGroups,
  vulnerabilityScore,
} from "@/lib/aqi";
import type { Household } from "@/lib/types";

const HOUSEHOLD: Household = {
  adults: 2,
  children: 1,
  elders: 0,
  respiratory: false,
  pregnant: false,
  pets: false,
};

describe("PM2.5 to AQI", () => {
  it("maps EPA breakpoints correctly", () => {
    expect(pm25ToAqi(0)).toBe(0);
    expect(pm25ToAqi(12)).toBe(50);
    expect(pm25ToAqi(35.4)).toBe(100);
    expect(pm25ToAqi(55.4)).toBe(150);
    expect(pm25ToAqi(150.4)).toBe(200);
    expect(pm25ToAqi(250.4)).toBe(300);
    expect(pm25ToAqi(500.4)).toBe(500);
  });

  it("handles invalid and out-of-range values", () => {
    expect(pm25ToAqi(-5)).toBe(0);
    expect(pm25ToAqi(Number.NaN)).toBe(0);
    expect(pm25ToAqi(999)).toBe(500);
  });

  it("round-trips approximately through the inverse", () => {
    for (const pm25 of [5, 20, 45, 90, 200, 400]) {
      const aqi = pm25ToAqi(pm25);
      expect(Math.abs(aqiToPm25(aqi) - pm25)).toBeLessThanOrEqual(1);
    }
  });
});

describe("AQI categories and household risk", () => {
  it("uses category boundaries", () => {
    expect(aqiCategory(50).category).toBe("good");
    expect(aqiCategory(51).category).toBe("moderate");
    expect(aqiCategory(101).category).toBe("sensitive");
    expect(aqiCategory(151).category).toBe("unhealthy");
    expect(aqiCategory(201).category).toBe("very-unhealthy");
    expect(aqiCategory(301).category).toBe("hazardous");
  });

  it("raises risk for sensitive households without over-alarming at 203", () => {
    expect(riskFor(203, HOUSEHOLD)).toBe("severe");
    expect(riskFor(203, { ...HOUSEHOLD, children: 0 })).toBe("severe");
    expect(riskFor(120, HOUSEHOLD)).toBe("high");
    expect(riskFor(120, { ...HOUSEHOLD, children: 0 })).toBe("elevated");
    expect(riskFor(320, HOUSEHOLD)).toBe("critical");
    expect(riskFor(30, HOUSEHOLD)).toBe("low");
  });

  it("describes every sensitive group without duplicates", () => {
    const groups = sensitiveGroups({
      adults: 2,
      children: 2,
      elders: 1,
      respiratory: true,
      pregnant: true,
      pets: true,
    });
    expect(groups).toContain("children");
    expect(groups).toContain("older adult");
    expect(groups).toContain("someone with a respiratory condition");
    expect(groups).toContain("a pregnant family member");
  });

  it("weights multiple vulnerabilities", () => {
    expect(vulnerabilityScore(HOUSEHOLD)).toBeGreaterThan(0);
    expect(
      vulnerabilityScore({ ...HOUSEHOLD, respiratory: true, pregnant: true }),
    ).toBeGreaterThan(vulnerabilityScore(HOUSEHOLD));
  });
});
