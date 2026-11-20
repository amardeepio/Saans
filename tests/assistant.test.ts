import { describe, expect, it } from "vitest";
import { buildLocalAnswer, localSuggestions } from "@/lib/assistant";
import { DEFAULT_CITY, DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { sampleReading } from "@/lib/sample-air";
import type { Profile } from "@/lib/types";

const AIR = sampleReading(DEFAULT_CITY, new Date("2026-01-12T08:00:00.000Z"));
const PROFILE: Profile = DEFAULT_PROFILE;
const ADVICE = buildAdvice(PROFILE, AIR);

describe("local assistant", () => {
  it("gives a household-aware school-run answer", () => {
    const response = buildLocalAnswer("Is the school run safe today?", PROFILE, AIR, ADVICE);
    expect(response.mode).toBe("local");
    expect(response.answer).toContain("Delhi");
    expect(response.answer).toContain(`AQI ${AIR.aqi}`);
    expect(response.answer.toLowerCase()).toContain("school");
    expect(response.suggestions.length).toBe(3);
  });

  it("explains HEPA sizing and rejects ozone generators", () => {
    const response = buildLocalAnswer("Which air purifier should I buy?", PROFILE, AIR, ADVICE);
    expect(response.answer).toContain("HEPA");
    expect(response.answer).toContain("CADR");
    expect(response.answer.toLowerCase()).toContain("ozone");
  });

  it("does not promote houseplants as air purifiers", () => {
    const response = buildLocalAnswer("Do indoor plants clean the air?", PROFILE, AIR, ADVICE);
    expect(response.answer.toLowerCase()).toContain("not air purifiers");
  });

  it("uses urgent-care language for breathing symptoms", () => {
    const response = buildLocalAnswer("My father has chest pain and cannot breathe", PROFILE, AIR, ADVICE);
    expect(response.answer.toLowerCase()).toContain("emergency medical help");
    expect(response.answer.toLowerCase()).toContain("not diagnosis");
  });

  it("uses the cleaner outdoor window", () => {
    const response = buildLocalAnswer("When should we go for a walk?", PROFILE, AIR, ADVICE);
    expect(response.answer).toContain(ADVICE.windows.best.label);
  });

  it("explains the cheapest first steps without inventing a price", () => {
    const response = buildLocalAnswer("We have a very small budget. What helps most?", PROFILE, AIR, ADVICE);
    expect(response.answer.toLowerCase()).toContain("no-cost");
    expect(response.answer).not.toMatch(/₹\d{4,}/);
  });

  it("never reflects raw script tags from a question", () => {
    const response = buildLocalAnswer("<script>alert(1)</script>", PROFILE, AIR, ADVICE);
    expect(response.answer).not.toContain("<script>");
    expect(response.answer.length).toBeGreaterThan(20);
  });

  it("returns three context-fit suggestions", () => {
    const suggestions = localSuggestions({ ...PROFILE, mobility: { ...PROFILE.mobility, primary: "car" } });
    expect(suggestions.length).toBe(3);
    expect(suggestions[0]).toContain("transit");
  });

  it("returns follow-ups that follow the answer's topic", () => {
    const school = buildLocalAnswer("Is the school run safe today?", PROFILE, AIR, ADVICE);
    const purifier = buildLocalAnswer("Which air purifier should I buy?", PROFILE, AIR, ADVICE);

    expect(school.suggestions).not.toEqual(purifier.suggestions);
    expect(purifier.suggestions.join(" ").toLowerCase()).toContain("purifier");
    expect(school.suggestions.length).toBe(3);
  });
});
