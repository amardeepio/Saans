"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROFILE, CITIES } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { formatNumber, formatObservedAt } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { INDIA_TRACKED_CITIES } from "@/lib/india";
import { measurementFor } from "@/lib/measurement";
import { sampleReading } from "@/lib/sample-air";
import type { AirReading, City, CityDetail, Profile } from "@/lib/types";
import { deserialiseProfile, PROFILE_STORAGE_KEY, sanitiseAirReading } from "@/lib/validation";
import { AqiScaleToggle } from "./AqiScaleToggle";
import { Assistant } from "./Assistant";
import { GrapNotice } from "./GrapNotice";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { PollutantGrid } from "./PollutantGrid";
import { usePreferences } from "./PreferencesProvider";
import { ShareRow } from "./ShareRow";
import { WeatherGlyph } from "./WeatherGlyph";

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

function cityParams(city: City): string {
  const params = new URLSearchParams({
    id: city.id,
    name: city.name,
    country: city.country,
    lat: String(city.latitude),
    lon: String(city.longitude),
  });
  if (city.region) params.set("region", city.region);
  return params.toString();
}

function fallbackRanking(): CityDetail[] {
  return INDIA_TRACKED_CITIES.map((city) => {
    const { hourly: _hourly, ...detail } = sampleReading(city);
    return detail;
  }).sort((a, b) => b.aqi - a.aqi);
}

export function DashboardApp() {
  const { settings } = usePreferences();
  const [ranking, setRanking] = useState<CityDetail[] | null>(null);
  const [selected, setSelected] = useState<CityDetail | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");
  const [loadingCity, setLoadingCity] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const fallback = useMemo(() => fallbackRanking(), []);

  useEffect(() => {
    const saved = deserialiseProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY));
    if (saved) setProfile(saved);
  }, []);

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

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setSearching(false);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchNote("");
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}&country=IN`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search");
        const data = (await response.json()) as { results?: City[] };
        const matches = Array.isArray(data.results) ? data.results.slice(0, 6) : [];
        setResults(matches);
        setSearchNote(
          matches.length
            ? `${matches.length} matching Indian location${matches.length === 1 ? "" : "s"} found. Choose one below.`
            : "No Indian city or district matched. Try a larger nearby city.",
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchNote("Location search is unavailable right now. Try again in a moment.");
          setResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

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
    skipNextSearch.current = query !== city.name;
    setResults([]);
    setSearching(false);
    setLoadingCity(true);
    setSearchNote(`Loading ${city.name}…`);
    setQuery(city.name);
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]);

    try {
      const response = await fetch(`/api/air?${cityParams(city)}`, { signal });
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

  const topCities = ranking?.slice(0, 12) ?? [];
  const maxAqi = Math.max(1, ...topCities.map((item) => item.aqi));
  const selectedMeasurement = selected
    ? measurementFor(settings.aqiStandard, selected)
    : null;

  // The assistant answers about whichever city is selected, using the household
  // profile saved on the daily-plan page.
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
              Search any city or district in India for a fast read on AQI, weather in Celsius
              and the pollutants behind the number.
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
                  {results.map((city) => (
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
          <section id="city-ranking" className="dashboard-ranking-panel" aria-labelledby="ranking-title">
            <div className="dashboard-panel-head">
              <div>
                <span className="eyebrow">Top polluted now</span>
                <h2 id="ranking-title">India&apos;s hazy dozen.</h2>
              </div>
              <span className="dashboard-source-pill">
                <span
                  className={`source-dot ${liveCount > 0 ? "is-live" : ""}`}
                  aria-hidden="true"
                />
                {sourceLabel}
              </span>
            </div>
            <p className="dashboard-panel-lede">
              Ranked by current US AQI among {INDIA_TRACKED_CITIES.length} major tracked Indian
              cities. Select a city to see its pollutant mix.
            </p>

            {ranking ? (
              <ol className="ranking-list" aria-label="Cities ranked by current AQI">
                {topCities.map((item, index) => {
                  const itemMeasurement = measurementFor(settings.aqiStandard, item);
                  const isSelected = selected?.city.id === item.city.id;
                  return (
                    <li key={item.city.id}>
                      <button
                        type="button"
                        className={`ranking-row ${isSelected ? "is-selected" : ""}`}
                        onClick={() => chooseRanking(item)}
                        aria-pressed={isSelected}
                      >
                        <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="ranking-city">
                          <strong>{item.city.name}</strong>
                          <small>{item.city.region ?? "India"}</small>
                        </span>
                        <span className={`ranking-weather tone-${itemMeasurement.tone}`}>
                          <WeatherGlyph code={item.weather.code} size={14} />
                          {Math.round(item.weather.temperatureC)}°C
                        </span>
                        <span className={`ranking-aqi tone-${itemMeasurement.tone}`}>
                          {formatNumber(itemMeasurement.value)}
                          <small>{itemMeasurement.shortLabel}</small>
                        </span>
                        <span className="ranking-bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(8, (item.aqi / maxAqi) * 100)}%` }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="ranking-loading" aria-busy="true" aria-label="Loading city ranking">
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
            )}
          </section>

          <section
            ref={detailRef}
            id="city-detail-panel"
            className="dashboard-detail-panel"
            aria-labelledby="selected-city-title"
          >
            <p className="sr-only" aria-live="polite">
              {selected ? `Showing air quality and pollutants for ${selected.city.name}.` : ""}
            </p>
            {selected && selectedMeasurement ? (
              <>
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">Pollutant watch</span>
                    <h2 id="selected-city-title">{selected.city.name}</h2>
                  </div>
                  <span className="dashboard-detail-source">
                    <span
                      className={`source-dot ${selected.source === "open-meteo" ? "is-live" : ""}`}
                      aria-hidden="true"
                    />
                    {selected.source === "open-meteo" ? "Live" : "Sample"}
                  </span>
                </div>

                <ShareRow
                  className="dashboard-share"
                  title={`${selected.city.name}${selected.city.region ? `, ${selected.city.region}` : ""}`}
                  value={selectedMeasurement.value}
                  scaleLabel={selectedMeasurement.scaleLabel}
                  label={selectedMeasurement.label}
                  path={`/dashboard?city=${selected.city.id}`}
                />

                <div className={`dashboard-selected-head tone-${selectedMeasurement.tone}`}>
                  <div className="dashboard-selected-aqi">
                    <strong>{formatNumber(selectedMeasurement.value)}</strong>
                    <span>
                      {selectedMeasurement.scaleLabel} · {selectedMeasurement.label}
                    </span>
                  </div>
                  <div className="dashboard-selected-weather">
                    <WeatherGlyph code={selected.weather.code} size={22} />
                    <div>
                      <strong>{Math.round(selected.weather.temperatureC)}°C</strong>
                      <span>
                        {selected.weather.label} · feels {Math.round(selected.weather.apparentTemperatureC)}°
                      </span>
                      <small>
                        {selected.weather.humidity}% humidity · {selected.weather.windKph} km/h
                      </small>
                    </div>
                  </div>
                </div>

                <p className="dashboard-selected-advice">
                  {selectedMeasurement.advice} Last reading {formatObservedAt(selected.observedAt)}.
                </p>

                <GrapNotice grap={selectedMeasurement.grap} />
                <PollutantGrid readings={selected} standard={settings.aqiStandard} />
                <p className="dashboard-detail-note">
                  Pollutant cards show ambient concentrations, not personal exposure. WHO
                  comparisons are context, not a diagnosis.
                </p>
              </>
            ) : (
              <div className="dashboard-detail-empty">
                <span>
                  <Icon name="wind" size={26} />
                </span>
                <h2 id="selected-city-title">Choose a city.</h2>
                <p>Select a city from the ranking or search to see its pollutant mix.</p>
              </div>
            )}
          </section>
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
