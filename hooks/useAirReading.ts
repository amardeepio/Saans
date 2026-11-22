"use client";

import { useEffect, useRef, useState } from "react";
import { buildCityQuery } from "@/lib/cities";
import { cacheReading, getCachedReading } from "@/lib/offline";
import { sampleReading } from "@/lib/sample-air";
import type { AirReading, Profile } from "@/lib/types";
import { sanitiseAirReading } from "@/lib/validation";

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

    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(12_000),
    ]);

    fetch(`/api/air?${buildCityQuery(city)}`, { signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("air");
        const reading = sanitiseAirReading(await response.json(), profileRef.current);
        if (!reading) throw new Error("air-format");
        return reading;
      })
      .then((reading) => {
        if (controller.signal.aborted) return;
        setState({ cityId: city.id, air: reading, usedCached: false });
        cacheReading(reading);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        const cached = getCachedReading(city.id);
        if (cached) {
          setState({ cityId: city.id, air: cached, usedCached: true });
        } else {
          setState({ cityId: city.id, air: sampleReading(city), usedCached: false });
        }
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
