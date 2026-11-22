"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, isAbortError } from "@/lib/client-fetch";
import { CLIENT_TIMEOUT_MS } from "@/lib/constants";
import { CITIES } from "@/lib/cities";
import { isIndianCity } from "@/lib/india";
import type { City } from "@/lib/types";

interface UseCitySearchOptions {
  indiaOnly?: boolean;
  debounceMs?: number;
}

export function useCitySearch(options: UseCitySearchOptions = {}) {
  const { indiaOnly = false, debounceMs = 240 } = options;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");
  const skipNextSearch = useRef(false);

  const selectQuerySilently = useCallback((nextQuery: string) => {
    skipNextSearch.current = true;
    setQuery(nextQuery);
    setResults([]);
    setSearching(false);
    setSearchNote("");
  }, []);

  const trimmed = query.trim();

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (trimmed.length < 2) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchNote("");
      try {
        const suffix = indiaOnly ? "&country=IN" : "";
        const data = await fetchJson<{ results?: City[] }>(
          `/api/geocode?q=${encodeURIComponent(trimmed)}${suffix}`,
          { signal: controller.signal, timeoutMs: CLIENT_TIMEOUT_MS.geocode },
        );
        const items = data.results ?? [];
        setResults(items);
        setSearchNote(
          items.length === 0
            ? indiaOnly
              ? "No matching Indian city found. Try another spelling."
              : "No matching city found. Try another spelling."
            : "",
        );
      } catch (error) {
        if (isAbortError(error)) return;
        const needle = trimmed.toLowerCase();
        const fallback = CITIES.filter((city) => {
          if (indiaOnly && !isIndianCity(city)) return false;
          return `${city.name} ${city.region ?? ""} ${city.country}`
            .toLowerCase()
            .includes(needle);
        });
        setResults(fallback);
        setSearchNote(fallback.length === 0 ? "Search is temporarily unavailable." : "");
      } finally {
        setSearching(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, indiaOnly, debounceMs]);

  const active = trimmed.length >= 2;
  return {
    query,
    setQuery,
    results: active ? results : [],
    setResults,
    searching: active ? searching : false,
    searchNote: active ? searchNote : "",
    setSearchNote,
    selectQuerySilently,
  };
}
