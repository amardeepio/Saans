"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "saans:install-hint-dismissed";

/** iOS Safari never fires `beforeinstallprompt`, so the hint is the only path. */
function isIosSafari() {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS reports itself as a Mac; touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && webkit;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let refreshing = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => undefined);

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // Safari private mode can refuse storage; fall back to showing the hint.
    }
    if (!isStandalone() && isIosSafari()) setIosHint(true);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  }

  function refresh() {
    navigator.serviceWorker.controller?.postMessage("SKIP_WAITING");
    setUpdateReady(false);
  }

  function dismiss() {
    setDismissed(true);
    setIosHint(false);
    setInstallEvent(null);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Nothing to persist; the strip stays hidden for this visit only.
    }
  }

  const showInstall = !dismissed && (Boolean(installEvent) || iosHint);

  if (!offline && !updateReady && !showInstall) return null;

  return (
    <div className="pwa-strip" role="status" aria-live="polite">
      {offline && (
        <span>
          <Icon name="wind" size={14} /> Offline · showing the last saved reading
        </span>
      )}
      {updateReady && (
        <button type="button" onClick={refresh}>
          A new version is ready. Refresh
        </button>
      )}
      {showInstall && installEvent && (
        <button type="button" onClick={() => void install()}>
          <Icon name="arrow" size={14} /> Install Saans
        </button>
      )}
      {showInstall && !installEvent && (
        <span className="pwa-ios-hint">
          <Icon name="arrow" size={14} /> Tap Share, then “Add to Home Screen”
        </span>
      )}
      {showInstall && (
        <button
          type="button"
          className="pwa-strip-dismiss"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}
