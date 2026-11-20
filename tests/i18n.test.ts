import { describe, expect, it } from "vitest";
import {
  DICTIONARIES,
  EN,
  HI,
  isLocale,
  isSupportedLocale,
  translate,
} from "@/lib/i18n";

describe("i18n dictionaries", () => {
  it("keeps every locale in sync with the English key set", () => {
    expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
  });

  it("translates known keys and falls back safely", () => {
    expect(translate("hi", "nav.today")).toBe("आज");
    expect(translate("en", "nav.today")).toBe("Today");
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(DICTIONARIES.hi["settings.title"]).toBeTruthy();
    expect(translate("hi", "missing.key" as never)).toBe("missing.key");
  });
});
