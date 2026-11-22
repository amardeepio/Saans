"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCitySearch } from "@/hooks/useCitySearch";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import { buildCityQuery, CITIES, DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { INDIA_TRACKED_CITIES } from "@/lib/india";
import { sampleReading } from "@/lib/sample-air";
import type { AirReading, City, CityDetail } from "@/lib/types";
import { sanitiseAirReading } from "@/lib/validation";
import { AqiScaleToggle } from "./AqiScaleToggle";
import { Assistant } from "./Assistant";
import { CityDetailPanel } from "./dashboard/CityDetailPanel";
import { CityRankingList } from "./dashboard/CityRankingList";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { usePreferences } from "./PreferencesProvider";

function requestedCityId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("city");
}

function pickCity(items: CityDetail[], id: string | null): CityDetail | undefined {
  if (!id) return undefined;
  return items.find((item) => item.city.id === id);
}

/** Keeps the address bar shareable without turning the route dynamic. */
function syncCityParam(id: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("city") === id) return;
  url.searchParams.set("city", id);
  window.history.replaceState(null, "", url);
}

function fallbackRanking(): CityDetail[] {
  return INDIA_TRACKED_CITIES.map((city) => {
    const { hourly: _hourly, ...detail } = sampleReading(city);
    void _hourly;
    return detail;
  }).sort((a, b) => b.aqi - a.aqi);
}

export function DashboardApp() {
  const { settings } = usePreferences();
  const { profile } = useStoredProfile();
  const [ranking, setRanking] = useState<CityDetail[] | null>(null);
  const [selected, setSelected] = useState<CityDetail | null>(null);
  const [loadingCity, setLoadingCity] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const fallback = useMemo(() => fallbackRanking(), []);

  const {
    query,
    setQuery,
    results,
    searching,
    searchNote,
    setSearchNote,
    selectQuerySilently,
  } = useCitySearch({ indiaOnly: true, debounceMs: 350 });

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);

    fetch("/api/india-cities", { signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("ranking");
        const data = (await response.json()) as { cities?: CityDetail[] };
        if (!Array.isArray(data.cities) || data.cities.length === 0) {
          throw new Error("ranking-format");
        }
        return data.cities;
      })
      .then((items) => {
        setRanking(items);
        setSelected((current) => current ?? pickCity(items, requestedCityId()) ?? items[0]);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setRanking(fallback);
        setSelected((current) => current ?? pickCity(fallback, requestedCityId()) ?? fallback[0]);
      });

    return () => controller.abort();
  }, [fallback]);

  const liveCount = ranking?.filter((item) => item.source === "open-meteo").length ?? 0;
  const sourceLabel = ranking
    ? liveCount === ranking.length
      ? "Live · Open-Meteo"
      : liveCount > 0
        ? "Partly live"
        : "Sample pattern"
    : "Reading cities…";

  function revealDetail() {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 980px)").matches) {
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      }, 60);
    }
  }

  function chooseRanking(item: CityDetail) {
    setSelected(item);
    syncCityParam(item.city.id);
    revealDetail();
  }

  async function chooseSearchResult(city: City) {
    selectQuerySilently(city.name);
    setLoadingCity(true);
    setSearchNote(`Loading ${city.name}…`);
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]);

    try {
      const response = await fetch(`/api/air?${buildCityQuery(city)}`, { signal });
      if (!response.ok) throw new Error("air");
      const safe = sanitiseAirReading(await response.json(), { ...DEFAULT_PROFILE, city });
      if (!safe) throw new Error("air-format");
      setSelected(safe);
      syncCityParam(city.id);
      setSearchNote(`Showing ${city.name}.`);
    } catch {
      const fallbackReading: AirReading = sampleReading(city);
      setSelected(fallbackReading);
      syncCityParam(city.id);
      setSearchNote(`Showing ${city.name} using a clearly-labelled sample pattern.`);
    } finally {
      setLoadingCity(false);
      revealDetail();
    }
  }

  const assistantProfile = useMemo(
    () => (selected ? { ...profile, city: selected.city } : profile),
    [profile, selected],
  );
  const assistantAir = useMemo<AirReading | null>(
    () => (selected ? { ...selected, hourly: [] } : null),
    [selected],
  );
  const assistantAdvice = useMemo(
    () => (assistantAir ? buildAdvice(assistantProfile, assistantAir, settings.aqiStandard) : null),
    [assistantProfile, assistantAir, settings.aqiStandard],
  );

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#city-ranking">
        Skip to city ranking
      </a>

      <header className="site-header dashboard-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Saans home">
            <Logo />
          </Link>
          <nav className="main-nav" aria-label="Primary navigation">
            <Link href="/">Daily plan</Link>
            <Link href="/#choices">Choices lab</Link>
            <span className="nav-current">Dashboard</span>
          </nav>
          <div className="header-actions">
            <AqiScaleToggle compact />
            <span className="live-pill">
              <span className={`source-dot ${liveCount > 0 ? "is-live" : ""}`} aria-hidden="true" />
              India · {sourceLabel}
            </span>
            <Link href="/" className="button button--dark button--small">
              <Icon name="arrow" size={15} />
              Back to plan
            </Link>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <div className="dashboard-hero-copy">
            <span className="eyebrow">India city scan · live air + weather</span>
            <h1 id="dashboard-title">
              The air,
              <br />
              before you <em>step out.</em>
            </h1>
            <p>
              Search any city or district in India for a fast read on AQI, weather in Celsius and
              the pollutants behind the number.
            </p>
          </div>

          <div className="dashboard-search-panel">
            <form
              className="dashboard-search"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="india-search">Search India</label>
              <div className="dashboard-search-field">
                <Icon name="search" size={20} />
                <input
                  id="india-search"
                  type="search"
                  placeholder="Delhi, Patna, Kochi…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  aria-describedby="india-search-note"
                />
                {(searching || loadingCity) && <span className="search-spinner" aria-hidden="true" />}
                <span className="search-country-badge">India only</span>
              </div>
              <p id="india-search-note" className="dashboard-search-note" aria-live="polite">
                {searchNote || "Every result is filtered to India before it reaches your screen."}
              </p>
            </form>

            <div className="dashboard-search-results" id="india-search-results">
              {results.length > 0 && (
                <ul aria-label="Indian location results">
                  {results.slice(0, 6).map((city) => (
                    <li key={`${city.id}-${city.name}`}>
                      <button type="button" onClick={() => void chooseSearchResult(city)}>
                        <span className="search-result-pin">
                          <Icon name="pin" size={15} />
                        </span>
                        <span>
                          <strong>{city.name}</strong>
                          <small>{[city.region, city.country].filter(Boolean).join(", ")}</small>
                        </span>
                        <Icon name="arrow-right" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dashboard-quick-cities">
              <span>Try</span>
              {["delhi", "patna", "kolkata", "bengaluru"].map((id) => {
                const city = CITIES.find((item) => item.id === id);
                if (!city) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void chooseSearchResult(city)}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="India air quality dashboard">
          <CityRankingList
            ranking={ranking}
            selectedId={selected?.city.id}
            standard={settings.aqiStandard}
            liveCount={liveCount}
            sourceLabel={sourceLabel}
            onSelect={chooseRanking}
          />
          <CityDetailPanel
            detailRef={detailRef}
            selected={selected}
            standard={settings.aqiStandard}
          />
        </section>

        <p className="dashboard-disclaimer">
          The ranking is limited to the tracked city list on this page. Open-Meteo readings are
          forecasts and can lag street-level conditions. Saans is not a medical device.
        </p>
      </main>

      <footer className="dashboard-footer">
        <Link href="/" className="brand" aria-label="Back to Saans">
          <Logo />
        </Link>
        <p>
          A clearer day, one choice at a time.{" "}
          <Link href="/">Return to your household plan</Link>.
        </p>
        <span>Air + weather: Open-Meteo</span>
      </footer>

      {assistantAir && assistantAdvice && (
        <Assistant
          profile={assistantProfile}
          air={assistantAir}
          advice={assistantAdvice}
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
        />
      )}
    </div>
  );
}
