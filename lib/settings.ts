import { isLocale } from "./i18n";
import type { AqiStandard, Locale } from "./types";

export interface AlertPreferences {
  enabled: boolean;
  threshold: number;
  cleanWindow: boolean;
  schoolRun: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface AppSettings {
  version: 1;
  aqiStandard: AqiStandard;
  locale: Locale;
  simpleMode: boolean;
  alerts: AlertPreferences;
}

export const SETTINGS_STORAGE_KEY = "saans.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  // The primary audience is in India; US AQI remains one tap away.
  aqiStandard: "naqi",
  locale: "en",
  simpleMode: false,
  alerts: {
    enabled: false,
    threshold: 150,
    cleanWindow: true,
    schoolRun: false,
    quietStart: "22:00",
    quietEnd: "07:00",
  },
};

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function oneOf<T extends string>(value: unknown, values: T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

function time(value: unknown, fallback: string): string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

export function sanitiseSettings(value: unknown): AppSettings {
  const input = object(value);
  const alertInput = object(input.alerts);
  const threshold = Number(alertInput.threshold);

  return {
    version: 1,
    aqiStandard: oneOf<AqiStandard>(
      input.aqiStandard,
      ["us", "naqi"],
      DEFAULT_SETTINGS.aqiStandard,
    ),
    locale: isLocale(input.locale) ? input.locale : DEFAULT_SETTINGS.locale,
    simpleMode: typeof input.simpleMode === "boolean" ? input.simpleMode : false,
    alerts: {
      enabled: typeof alertInput.enabled === "boolean" ? alertInput.enabled : false,
      threshold:
        Number.isFinite(threshold) && threshold >= 50 && threshold <= 500
          ? Math.round(threshold)
          : DEFAULT_SETTINGS.alerts.threshold,
      cleanWindow:
        typeof alertInput.cleanWindow === "boolean" ? alertInput.cleanWindow : true,
      schoolRun: typeof alertInput.schoolRun === "boolean" ? alertInput.schoolRun : false,
      quietStart: time(alertInput.quietStart, DEFAULT_SETTINGS.alerts.quietStart),
      quietEnd: time(alertInput.quietEnd, DEFAULT_SETTINGS.alerts.quietEnd),
    },
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || parsed.version !== 1) return DEFAULT_SETTINGS;
    return sanitiseSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing can block storage. The session still works.
  }
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "hi" ? "ltr" : "ltr";
}
