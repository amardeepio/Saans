"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reads a synchronous client-only value without triggering hydration
 * mismatches or cascading renders from `useEffect`.
 */
export function useClientValue<T>(getClientSnapshot: () => T, serverSnapshot: T): T {
  return useSyncExternalStore(noopSubscribe, getClientSnapshot, () => serverSnapshot);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useIsOffline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false,
  );
}
