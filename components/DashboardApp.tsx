"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCitySearch } from "@/hooks/useCitySearch";
import { useIndiaRanking } from "@/hooks/useIndiaRanking";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import { fetchJson, isAbortError } from "@/lib/client-fetch";
import { buildCityQuery, CITIES, DEFAULT_PROFILE } from "@/lib/cities";
import { syncCityParam } from "@/lib/city-param";
import { CLIENT_TIMEOUT_MS } from "@/lib/constants";
import { buildAdvice } from "@/lib/engine";
import { translate } from "@/lib/i18n";
import { sampleReading } from "@/lib/sample-air";
import { sourceStatusLabel } from "@/lib/source";
import type { AirReading, City, CityDetail } from "@/lib/types";
import { sanitizeAirReading } from "@/lib/validation";
import { AqiScaleToggle } from "./AqiScaleToggle";
import { Assistant } from "./Assistant";
import { CityDetailPanel } from "./dashboard/CityDetailPanel";
import { CityRankingList } from "./dashboard/CityRankingList";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { usePreferences } from "./PreferencesProvider";

export function DashboardApp() {
  const { settings } = usePreferences();
  const { profile } = useStoredProfile();
  const { ranking, selected, setSelected } = useIndiaRanking();
  const [loadingCity, setLoadingCity] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    results,
    searching,
    searchNote,
    setSearchNote,
    selectQuerySilently,
  } = useCitySearch({ indiaOnly: true, debounceMs: 350 });

  const liveCount = ranking?.filter((item) => item.source === "open-meteo").length ?? 0;
  const sourceLabel = ranking
    ? sourceStatusLabel(liveCount, ranking.length, settings.locale)
    : translate(settings.locale, "source.reading");

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
    setSearchNote(translate(settings.locale, "dashboard.loadingCity", { city: city.name }));

    try {
      const payload = await fetchJson<unknown>(`/api/air?${buildCityQuery(city)}`, {
        timeoutMs: CLIENT_TIMEOUT_MS.air,
      });
      const safe = sanitizeAirReading(payload, { ...DEFAULT_PROFILE, city });
      if (!safe) throw new Error("air-format");
      setSelected(safe);
      syncCityParam(city.id);
      setSearchNote(translate(settings.locale, "dashboard.showingCity", { city: city.name }));
    } catch (error) {
      if (isAbortError(error)) return;
      setSelected(sampleReading(city));
      syncCityParam(city.id);
      setSearchNote(
        translate(settings.locale, "dashboard.showingSample", { city: city.name }),
      );
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
        {translate(settings.locale, "dashboard.skip")}
      </a>

      <header className="site-header dashboard-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label={translate(settings.locale, "brand.home")}>
            <Logo />
          </Link>
          <nav className="main-nav" aria-label={translate(settings.locale, "dashboard.navPrimary")}>
            <Link href="/">{translate(settings.locale, "dashboard.navPlan")}</Link>
            <Link href="/#choices">{translate(settings.locale, "dashboard.navChoices")}</Link>
            <span className="nav-current">
              {translate(settings.locale, "dashboard.navCurrent")}
            </span>
          </nav>
          <div className="header-actions">
            <AqiScaleToggle compact />
            <span className="live-pill">
              <span className={`source-dot ${liveCount > 0 ? "is-live" : ""}`} aria-hidden="true" />
              {translate(settings.locale, "dashboard.livePill", { status: sourceLabel })}
            </span>
            <Link href="/" className="button button--dark button--small">
              <Icon name="arrow" size={15} />
              {translate(settings.locale, "dashboard.backToPlan")}
            </Link>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <div className="dashboard-hero-copy">
            <span className="eyebrow">{translate(settings.locale, "dashboard.heroEyebrow")}</span>
            <h1 id="dashboard-title">
              {translate(settings.locale, "dashboard.heroTitle1")}
              <br />
              {translate(settings.locale, "dashboard.heroTitle2")}{" "}
              <em>{translate(settings.locale, "dashboard.heroEm")}</em>
            </h1>
            <p>{translate(settings.locale, "dashboard.heroBody")}</p>
          </div>

          <div className="dashboard-search-panel">
            <form
              className="dashboard-search"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="india-search">
                {translate(settings.locale, "dashboard.searchLabel")}
              </label>
              <div className="dashboard-search-field">
                <Icon name="search" size={20} />
                <input
                  id="india-search"
                  type="search"
                  placeholder={translate(settings.locale, "dashboard.searchPlaceholder")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  aria-describedby="india-search-note"
                />
                {(searching || loadingCity) && <span className="search-spinner" aria-hidden="true" />}
                <span className="search-country-badge">
                  {translate(settings.locale, "dashboard.indiaOnly")}
                </span>
              </div>
              <p id="india-search-note" className="dashboard-search-note" aria-live="polite">
                {searchNote || translate(settings.locale, "dashboard.searchNote")}
              </p>
            </form>

            <div className="dashboard-search-results" id="india-search-results">
              {results.length > 0 && (
                <ul aria-label={translate(settings.locale, "dashboard.resultsLabel")}>
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
              <span>{translate(settings.locale, "dashboard.tryLabel")}</span>
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

        <section
          className="dashboard-grid"
          aria-label={translate(settings.locale, "dashboard.gridLabel")}
        >
          <CityRankingList
            ranking={ranking}
            selectedId={selected?.city.id}
            standard={settings.aqiStandard}
            liveCount={liveCount}
            sourceLabel={sourceLabel}
            locale={settings.locale}
            onSelect={chooseRanking}
          />
          <CityDetailPanel
            detailRef={detailRef}
            selected={selected}
            standard={settings.aqiStandard}
            locale={settings.locale}
          />
        </section>

        <p className="dashboard-disclaimer">
          {translate(settings.locale, "dashboard.disclaimer")}
        </p>
      </main>

      <footer className="dashboard-footer">
        <Link href="/" className="brand" aria-label={translate(settings.locale, "brand.home")}>
          <Logo />
        </Link>
        <p>
          {translate(settings.locale, "dashboard.footerTagline")}{" "}
          <Link href="/">{translate(settings.locale, "dashboard.footerReturn")}</Link>.
        </p>
        <span>{translate(settings.locale, "dashboard.footerSource")}</span>
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
