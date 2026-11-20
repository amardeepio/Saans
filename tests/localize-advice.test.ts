import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { applyAdviceTranslations, collectAdviceStrings } from "@/lib/localize-advice";
import { sampleReading } from "@/lib/sample-air";

const ADVICE = buildAdvice(
  DEFAULT_PROFILE,
  sampleReading(DEFAULT_PROFILE.city, new Date(2026, 10, 20, 9)),
  "naqi",
);

describe("advice localisation", () => {
  it("keeps the translated plan structurally intact", () => {
    const strings = collectAdviceStrings(ADVICE);
    const translated = strings.map((value) => `हिं ${value}`);
    const result = applyAdviceTranslations(ADVICE, translated);

    expect(result.actions).toHaveLength(ADVICE.actions.length);
    expect(result.actions[0].id).toBe(ADVICE.actions[0].id);
    expect(result.actions[0].impact).toEqual(ADVICE.actions[0].impact);
    expect(result.actions[0].title.startsWith("हिं ")).toBe(true);
    expect(result.measurement.value).toBe(ADVICE.measurement.value);
    expect(result.windows.best.displayAqi).toBe(ADVICE.windows.best.displayAqi);
    expect(result.topAction.id).toBe(ADVICE.topAction.id);
  });

  it("keeps structure when a translation array is incomplete", () => {
    const strings = collectAdviceStrings(ADVICE);
    const result = applyAdviceTranslations(ADVICE, strings.slice(0, 4));
    expect(result.actions).toHaveLength(ADVICE.actions.length);
    expect(result.actions[0].id).toBe(ADVICE.actions[0].id);
    expect(result.actions[0].title).toBe("");
  });
});
