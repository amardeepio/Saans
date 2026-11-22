import { localDateKey } from "./habits";
import type { AlertPreferences } from "./settings";
import { readStorage, writeStorage } from "./storage";
import type { AqiMeasurement } from "./types";

function minutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function isQuietHours(prefs: AlertPreferences, now = new Date()): boolean {
  const start = minutes(prefs.quietStart);
  const end = minutes(prefs.quietEnd);
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  // Quiet hours normally wrap midnight.
  if (start > end) return current >= start || current < end;
  return current >= start && current < end;
}

export function shouldAlert(
  measurement: AqiMeasurement,
  prefs: AlertPreferences,
  now = new Date(),
): boolean {
  if (!prefs.enabled) return false;
  if (measurement.value < prefs.threshold) return false;
  if (isQuietHours(prefs, now)) return false;
  return true;
}

export function alertDedupeKey(
  measurement: AqiMeasurement,
  now = new Date(),
): string {
  return `saans.alert.${localDateKey(now)}.${measurement.standard}.${measurement.value >= 300 ? "high" : "elevated"}`;
}

export function wasAlertShown(key: string): boolean {
  return readStorage(key) === "1";
}

export function markAlertShown(key: string): void {
  writeStorage(key, "1");
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function sendLocalNotification(title: string, body: string, url = "/"): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready
      .then((registration) =>
        registration.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url },
        }),
      )
      .catch(() => {
        new Notification(title, { body, icon: "/icons/icon-192.png" });
      });
    return;
  }

  new Notification(title, { body, icon: "/icons/icon-192.png" });
}
