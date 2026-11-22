import { describe, expect, it } from "vitest";
import { sourceStatusLabel } from "@/lib/source";

describe("source status label", () => {
  it("reports a fully live ranking", () => {
    expect(sourceStatusLabel(5, 5, "en")).toBe("Live · Open-Meteo");
  });

  it("reports a mixed ranking", () => {
    expect(sourceStatusLabel(2, 5, "en")).toBe("Partly live");
  });

  it("falls back to the sample label", () => {
    expect(sourceStatusLabel(0, 5, "en")).toBe("Sample pattern");
    expect(sourceStatusLabel(0, 0, "en")).toBe("Sample pattern");
  });

  it("translates for Hindi", () => {
    expect(sourceStatusLabel(5, 5, "hi")).toBe("लाइव · Open-Meteo");
  });
});
