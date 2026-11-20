import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDecimal,
  formatInr,
  formatNumber,
  formatObservedAt,
  pluralise,
  relativeFreshness,
} from "@/lib/format";

describe("display formatting", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats Indian numbers and currency", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
    expect(formatDecimal(12.34)).toBe("12.3");
    expect(formatInr(-1250)).toBe("₹1,250");
    expect(formatInr(0)).toBe("₹0");
  });

  it("formats Open-Meteo local timestamps without shifting timezones", () => {
    expect(formatObservedAt("2026-11-20T11:30")).toBe("11:30 AM local");
    expect(formatObservedAt("2026-11-20T00:05")).toBe("12:05 AM local");
    expect(formatObservedAt("2026-11-20T24:00")).toBe("12:00 PM local");
  });

  it("formats ISO timestamps and invalid input", () => {
    expect(formatObservedAt("2026-11-20T12:00:00.000Z")).toMatch(/\d/);
    expect(formatObservedAt("not-a-date")).toBe("recently");
  });

  it("pluralises singular and plural labels", () => {
    expect(pluralise(1, "city")).toBe("1 city");
    expect(pluralise(3, "city")).toBe("3 cities");
    expect(pluralise(2, "match", "matches")).toBe("2 matches");
  });

  it("describes freshness in human terms", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
    expect(relativeFreshness("2026-11-20T11:59:30.000Z")).toBe("updated just now");
    expect(relativeFreshness("2026-11-20T11:40:00.000Z")).toBe("updated 20 min ago");
    expect(relativeFreshness("2026-11-20T09:00:00.000Z")).toBe("updated 3 hr ago");
    expect(relativeFreshness("2026-11-18T09:00:00.000Z")).toBe("forecast snapshot");
    expect(relativeFreshness("bad")).toBe("recently updated");
  });
});
