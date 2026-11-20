import { afterEach, describe, expect, it, vi } from "vitest";
import {
  alertDedupeKey,
  isQuietHours,
  markAlertShown,
  requestNotificationPermission,
  sendLocalNotification,
  shouldAlert,
  wasAlertShown,
} from "@/lib/alerts";
import type { AlertPreferences } from "@/lib/settings";
import type { AqiMeasurement } from "@/lib/types";

const PREFS: AlertPreferences = {
  enabled: true,
  threshold: 150,
  cleanWindow: true,
  schoolRun: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};

const MEASUREMENT: AqiMeasurement = {
  standard: "naqi",
  value: 220,
  scaleLabel: "Indian NAQI",
  category: "poor",
  label: "Poor",
  shortLabel: "Poor",
  advice: "Reduce exertion.",
  tone: "warning",
  grap: null,
  estimated: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("alert rules", () => {
  it("handles quiet hours that wrap midnight", () => {
    expect(isQuietHours(PREFS, new Date(2026, 10, 20, 23, 0))).toBe(true);
    expect(isQuietHours(PREFS, new Date(2026, 10, 20, 6, 30))).toBe(true);
    expect(isQuietHours(PREFS, new Date(2026, 10, 20, 12, 0))).toBe(false);
  });

  it("alerts only when enabled, above threshold and outside quiet hours", () => {
    expect(shouldAlert(MEASUREMENT, PREFS, new Date(2026, 10, 20, 12, 0))).toBe(true);
    expect(
      shouldAlert(MEASUREMENT, { ...PREFS, enabled: false }, new Date(2026, 10, 20, 12, 0)),
    ).toBe(false);
    expect(
      shouldAlert(MEASUREMENT, { ...PREFS, threshold: 300 }, new Date(2026, 10, 20, 12, 0)),
    ).toBe(false);
    expect(shouldAlert(MEASUREMENT, PREFS, new Date(2026, 10, 20, 23, 0))).toBe(false);
  });

  it("builds a stable daily dedupe key", () => {
    const key = alertDedupeKey(MEASUREMENT, new Date(2026, 10, 20, 12));
    expect(key).toContain("2026-11-20");
    expect(key).toContain("naqi");
  });

  it("requests permission only once and handles denial", async () => {
    const requestPermission = vi.fn(async () => "granted" as NotificationPermission);
    const NotificationMock = { permission: "default", requestPermission };
    vi.stubGlobal("window", { Notification: NotificationMock });
    vi.stubGlobal("Notification", NotificationMock);

    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(requestPermission).toHaveBeenCalledTimes(1);

    NotificationMock.permission = "denied";
    await expect(requestNotificationPermission()).resolves.toBe("denied");
  });

  it("remembers which alert was shown for the day", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    expect(wasAlertShown("key")).toBe(false);
    markAlertShown("key");
    expect(wasAlertShown("key")).toBe(true);
  });

  it("sends a service-worker notification when permitted", async () => {
    const showNotification = vi.fn(async () => undefined);
    const NotificationMock = { permission: "granted" };
    vi.stubGlobal("window", { Notification: NotificationMock });
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("navigator", {
      serviceWorker: { ready: Promise.resolve({ showNotification }) },
    });

    sendLocalNotification("Saans", "Air alert");
    await Promise.resolve();
    await Promise.resolve();
    expect(showNotification).toHaveBeenCalledWith(
      "Saans",
      expect.objectContaining({ body: "Air alert" }),
    );
  });
});
