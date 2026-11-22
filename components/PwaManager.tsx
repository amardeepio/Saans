"use client";

import { useEffect, useState } from "react";
import { useClientValue, useIsOffline } from "@/hooks/useClientValue";
import { translate } from "@/lib/i18n";
import { readStorage, writeStorage } from "@/lib/storage";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

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

function readDismissed(): boolean {
  return readStorage(DISMISS_KEY) === "1";
}

export function PwaManager() {
  const { settings } = usePreferences();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const offline = useIsOffline();
  const [updateReady, setUpdateReady] = useState(false);
  const iosHint = useClientValue(() => !isStandalone() && isIosSafari(), false);
  const initialDismissed = useClientValue(readDismissed, false);
  const [dismissedOverride, setDismissed] = useState(false);
  const dismissed = initialDismissed || dismissedOverride;

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
    setInstallEvent(null);
    writeStorage(DISMISS_KEY, "1");
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
          aria-label={translate(settings.locale, "pwa.dismiss")}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}
