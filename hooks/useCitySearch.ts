"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}${suffix}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("geocode");
        const data = (await response.json()) as { results?: City[] };
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
        if ((error as Error).name === "AbortError") return;
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
