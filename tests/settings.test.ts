import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  localeDirection,
  sanitizeSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from "@/lib/settings";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("app settings", () => {
  it("returns safe defaults for malformed values", () => {
    const settings = sanitizeSettings({
      aqiStandard: "metric",
      locale: "fr",
      simpleMode: "yes",
      alerts: { threshold: 9000, quietStart: "late" },
    });
    expect(settings.aqiStandard).toBe(DEFAULT_SETTINGS.aqiStandard);
    expect(settings.locale).toBe("en");
    expect(settings.simpleMode).toBe(false);
    expect(settings.alerts.threshold).toBe(DEFAULT_SETTINGS.alerts.threshold);
    expect(settings.alerts.quietStart).toBe(DEFAULT_SETTINGS.alerts.quietStart);
  });

  it("accepts valid preferences", () => {
    const settings = sanitizeSettings({
      aqiStandard: "us",
      locale: "hi",
      simpleMode: true,
      alerts: {
        enabled: true,
        threshold: 300,
        cleanWindow: false,
        schoolRun: true,
        quietStart: "23:30",
        quietEnd: "06:15",
      },
    });
    expect(settings.aqiStandard).toBe("us");
    expect(settings.locale).toBe("hi");
    expect(settings.simpleMode).toBe(true);
    expect(settings.alerts.enabled).toBe(true);
    expect(settings.alerts.threshold).toBe(300);
  });

  it("keeps the document direction LTR for the current locales", () => {
    expect(localeDirection("en")).toBe("ltr");
    expect(localeDirection("hi")).toBe("ltr");
  });

  it("loads and saves versioned preferences", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });

    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    saveSettings({ ...DEFAULT_SETTINGS, aqiStandard: "us", locale: "hi" });
    expect(loadSettings().aqiStandard).toBe("us");
    expect(loadSettings().locale).toBe("hi");

    store.set(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    store.set(SETTINGS_STORAGE_KEY, "{bad json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
