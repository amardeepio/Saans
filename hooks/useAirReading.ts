"use client";

import { useEffect, useRef, useState } from "react";
import { buildCityQuery } from "@/lib/cities";
import { fetchJson, isAbortError } from "@/lib/client-fetch";
import { CLIENT_TIMEOUT_MS } from "@/lib/constants";
import { cacheReading, getCachedReading } from "@/lib/offline";
import { sampleReading } from "@/lib/sample-air";
import type { AirReading, Profile } from "@/lib/types";
import { sanitizeAirReading } from "@/lib/validation";

interface ReadingState {
  cityId: string;
  air: AirReading;
  usedCached: boolean;
}

export function useAirReading(profile: Profile, enabled: boolean) {
  const [state, setState] = useState<ReadingState | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!enabled) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const city = profile.city;

    fetchJson(`/api/air?${buildCityQuery(city)}`, {
      signal: controller.signal,
      timeoutMs: CLIENT_TIMEOUT_MS.air,
    })
      .then((payload) => {
        const reading = sanitizeAirReading(payload, profileRef.current);
        if (!reading) throw new Error("air-format");
        if (controller.signal.aborted) return;
        setState({ cityId: city.id, air: reading, usedCached: false });
        cacheReading(reading);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        const cached = getCachedReading(city.id);
        setState({
          cityId: city.id,
          air: cached ?? sampleReading(city),
          usedCached: Boolean(cached),
        });
      });

    return () => controller.abort();
  }, [enabled, profile.city]);

  const currentMatch = state?.cityId === profile.city.id ? state : null;
  return {
    air: currentMatch?.air ?? null,
    loading: !currentMatch,
    usedCached: currentMatch?.usedCached ?? false,
  };
}
