import { describe, expect, it } from "vitest";
import { POLLUTANTS, pollutantDisplayValue, pollutantGuidelineText } from "@/lib/pollutants";

const READINGS = {
  pm25: 30,
  pm10: 60,
  co: 1213,
  so2: 42,
  no2: 25,
  o3: 80,
};

describe("pollutant presentation", () => {
  it("exposes exactly the six major pollutant cards", () => {
    expect(POLLUTANTS.map((item) => item.key)).toEqual([
      "pm25",
      "pm10",
      "co",
      "so2",
      "no2",
      "o3",
    ]);
    expect(POLLUTANTS.every((item) => item.accent.startsWith("#"))).toBe(true);
  });

  it("converts CO to mg/m³ for display", () => {
    const co = POLLUTANTS.find((item) => item.key === "co")!;
    expect(pollutantDisplayValue(co, READINGS)).toBeCloseTo(1.213, 3);
    expect(pollutantGuidelineText(co, READINGS)).toBe("Within WHO guideline");
  });

  it("describes exceedances against WHO guidelines", () => {
    const pm25 = POLLUTANTS.find((item) => item.key === "pm25")!;
    expect(pollutantGuidelineText(pm25, READINGS)).toBe("2.0× WHO guideline");
  });
});
