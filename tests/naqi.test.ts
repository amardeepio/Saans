import { describe, expect, it } from "vitest";
import {
  grapForNaqi,
  isNcrCity,
  naqiCategory,
  naqiFromReadings,
  pollutantSubIndex,
} from "@/lib/naqi";
import type { City } from "@/lib/types";

const READINGS = { pm25: 0, pm10: 0, co: 0, so2: 0, no2: 0, o3: 0 };

const DELHI: City = {
  id: "delhi",
  name: "Delhi",
  region: "NCT",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
};

const MUMBAI: City = {
  id: "mumbai",
  name: "Mumbai",
  country: "India",
  latitude: 19.076,
  longitude: 72.8777,
};

describe("CPCB NAQI", () => {
  it("maps PM2.5 breakpoints to the Indian index", () => {
    expect(pollutantSubIndex("pm25", 0)).toBe(0);
    expect(pollutantSubIndex("pm25", 30)).toBe(50);
    expect(pollutantSubIndex("pm25", 60)).toBe(100);
    expect(pollutantSubIndex("pm25", 90)).toBe(200);
    expect(pollutantSubIndex("pm25", 120)).toBe(300);
    expect(pollutantSubIndex("pm25", 250)).toBe(400);
    expect(pollutantSubIndex("pm25", 500)).toBe(500);
  });

  it("maps PM10 and converts CO from µg/m³ to mg/m³", () => {
    expect(pollutantSubIndex("pm10", 50)).toBe(50);
    expect(pollutantSubIndex("pm10", 100)).toBe(100);
    expect(pollutantSubIndex("pm10", 250)).toBe(200);
    expect(pollutantSubIndex("co", 1000)).toBe(50);
    expect(pollutantSubIndex("co", 2000)).toBe(100);
  });

  it("uses the worst pollutant sub-index and reports the dominant pollutant", () => {
    const result = naqiFromReadings({
      ...READINGS,
      pm25: 60,
      pm10: 300,
      no2: 40,
    });
    expect(result.value).toBeGreaterThanOrEqual(200);
    expect(result.dominantPollutant).toBe("pm10");
    expect(result.subIndices.pm25).toBe(100);
  });

  it("uses the CPCB category boundaries", () => {
    expect(naqiCategory(50).category).toBe("good");
    expect(naqiCategory(51).category).toBe("satisfactory");
    expect(naqiCategory(100).category).toBe("satisfactory");
    expect(naqiCategory(101).category).toBe("moderate");
    expect(naqiCategory(200).category).toBe("moderate");
    expect(naqiCategory(201).category).toBe("poor");
    expect(naqiCategory(300).category).toBe("poor");
    expect(naqiCategory(301).category).toBe("very-poor");
    expect(naqiCategory(400).category).toBe("very-poor");
    expect(naqiCategory(401).category).toBe("severe");
  });

  it("maps NAQI to GRAP stages without claiming an official order", () => {
    expect(grapForNaqi(200)).toBeNull();
    expect(grapForNaqi(201)?.stage).toBe(1);
    expect(grapForNaqi(300)?.stage).toBe(1);
    expect(grapForNaqi(301)?.stage).toBe(2);
    expect(grapForNaqi(400)?.stage).toBe(2);
    expect(grapForNaqi(401)?.stage).toBe(3);
    expect(grapForNaqi(450)?.stage).toBe(3);
    expect(grapForNaqi(451)?.stage).toBe(4);
    expect(grapForNaqi(451)?.official).toBe(false);
  });

  it("recognises Delhi-NCR cities by id, name and coordinates", () => {
    expect(isNcrCity(DELHI)).toBe(true);
    expect(isNcrCity(MUMBAI)).toBe(false);
    expect(
      isNcrCity({
        ...MUMBAI,
        id: "custom",
        name: "Custom",
        latitude: 28.5,
        longitude: 77.2,
      }),
    ).toBe(true);
  });
});
