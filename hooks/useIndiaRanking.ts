"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, isAbortError } from "@/lib/client-fetch";
import { pickCity, requestedCityId } from "@/lib/city-param";
import { CLIENT_TIMEOUT_MS } from "@/lib/constants";
import { sampleIndiaRanking } from "@/lib/india";
import type { CityDetail } from "@/lib/types";

/**
 * Loads the India ranking once and seeds the selected city from the URL (or
 * the worst reading). Keeping the sample ranking ready means the dashboard
 * never renders an empty column.
 */
export function useIndiaRanking() {
  const fallback = useMemo(() => sampleIndiaRanking(), []);
  const [ranking, setRanking] = useState<CityDetail[] | null>(null);
  const [selected, setSelected] = useState<CityDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchJson<{ cities?: CityDetail[] }>("/api/india-cities", {
      signal: controller.signal,
      timeoutMs: CLIENT_TIMEOUT_MS.ranking,
    })
      .then((data) => {
        const items = data.cities;
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("ranking-format");
        }
        setRanking(items);
        setSelected((current) => current ?? pickCity(items, requestedCityId()) ?? items[0] ?? null);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setRanking(fallback);
        setSelected((current) => current ?? pickCity(fallback, requestedCityId()) ?? fallback[0] ?? null);
      });

    return () => controller.abort();
  }, [fallback]);

  return { ranking, selected, setSelected };
}
