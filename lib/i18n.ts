import { EN, type TranslationKey } from "./locales/en";
import { HI } from "./locales/hi";
import type { Locale } from "./types";

export { EN, HI, type TranslationKey };

export const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  en: EN,
  hi: HI,
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

export function translate(
  locale: Locale,
  key: TranslationKey,
  values?: Record<string, string | number>,
): string {
  let value = DICTIONARIES[locale]?.[key] ?? EN[key] ?? key;
  if (values) {
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "hi";
}

/** Server-side helper used by the optional translation route. */
export function isSupportedLocale(value: unknown): value is Locale {
  return isLocale(value);
}
