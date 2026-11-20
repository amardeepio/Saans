"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { formatDecimal, formatInr, formatNumber, formatObservedAt } from "@/lib/format";
import { sampleReading } from "@/lib/sample-air";
import type { AirReading, Profile } from "@/lib/types";
import {
  deserialiseProfile,
  PROFILE_STORAGE_KEY,
  sanitiseAirReading,
  serialiseProfile,
} from "@/lib/validation";
import { AqiOrb } from "./AqiOrb";
import { Assistant } from "./Assistant";
import { ChoiceLab } from "./ChoiceLab";
import { CityPulse } from "./CityPulse";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Playbook } from "./Playbook";
import { SetupDialog } from "./SetupDialog";
import { CommunitySection, SwapsSection } from "./SwapsSection";
import { WeatherGlyph } from "./WeatherGlyph";

function cityQuery(city: Profile["city"]): string {
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

export function SaansApp() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [personalised, setPersonalised] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [air, setAir] = useState<AirReading | null>(null);
  const [airLoading, setAirLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = deserialiseProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY));
    if (saved) {
      setProfile(saved);
      setPersonalised(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setAirLoading(true);
    setAir(null);

    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(12_000),
    ]);

    fetch(`/api/air?${cityQuery(profile.city)}`, { signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("air");
        const reading = sanitiseAirReading(await response.json(), profile);
        if (!reading) throw new Error("air-format");
        return reading;
      })
      .then((reading) => {
        if (!controller.signal.aborted) setAir(reading);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setAir(sampleReading(profile.city));
      })
      .finally(() => {
        if (!controller.signal.aborted) setAirLoading(false);
      });

    return () => controller.abort();
  }, [hydrated, profile.city]);

  const advice = useMemo(() => (air ? buildAdvice(profile, air) : null), [profile, air]);

  const saveProfile = useCallback((next: Profile) => {
    setProfile(next);
    setPersonalised(true);
    setSetupOpen(false);
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, serialiseProfile(next));
    } catch {
      // Private browsing can block storage. The plan still works for this session.
    }
  }, []);

  const sourceNote =
    air?.source === "open-meteo"
      ? "Live air · Open-Meteo"
      : air
        ? "Sample air pattern"
        : "Reading the sky";

  return (
    <div id="top" className="app-shell">
      <a className="skip-link" href="#playbook">
        Skip to today&apos;s plan
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="brand" aria-label="Saans home">
            <Logo />
          </a>
          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#playbook">Today</a>
            <a href="#choices">Choices</a>
            <a href="/dashboard">Dashboard</a>
            <button type="button" className="nav-button" onClick={() => setAssistantOpen(true)}>
              Ask
            </button>
            <a href="#community">Community</a>
          </nav>
          <div className="header-actions">
            <span className="live-pill" title="Air-quality data source">
              <span className={`source-dot ${air?.source === "open-meteo" ? "is-live" : ""}`} aria-hidden="true" />
              {sourceNote}
            </span>
            <button type="button" className="button button--dark button--small" onClick={() => setSetupOpen(true)}>
              <Icon name="pin" size={15} />
              {personalised ? "Edit profile" : "Make it mine"}
            </button>
          </div>
        </div>
      </header>

      <CityPulse
        onUseCity={(city) =>
          saveProfile({ ...profile, city, updatedAt: new Date().toISOString() })
        }
      />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-line" aria-hidden="true" />
              Family air copilot · winter smog edition
            </div>
            <h1 id="hero-title">
              A <em>clearer</em> day,
              <br />
              one choice at a time.
            </h1>
            <p className="hero-lede">
              Saans turns today&apos;s air into a practical plan for your household — the school
              run, the kitchen, the commute, the bedroom. Every move shows the difference it can
              make.
            </p>
            <div className="hero-actions">
              <a className="button button--dark" href="#playbook">
                See today&apos;s plan
                <Icon name="arrow" size={18} />
              </a>
              <button type="button" className="button button--quiet" onClick={() => setSetupOpen(true)}>
                <Icon name="users" size={17} />
                Personalise in 60 seconds
              </button>
            </div>
            <div className="hero-trust">
              <span>
                <Icon name="shield" size={15} /> No account
              </span>
              <span>
                <Icon name="wind" size={15} /> Location-aware
              </span>
              <span>
                <Icon name="leaf" size={15} /> Impact shown
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="air-card">
              <div className="air-card-head">
                <div>
                  <span className="eyebrow">The air right now</span>
                  <h2>
                    {profile.city.name}
                    {profile.city.region ? `, ${profile.city.region}` : ""}
                  </h2>
                  {air && (
                    <p className="air-weather-line">
                      <WeatherGlyph code={air.weather.code} size={16} />
                      <strong>{Math.round(air.weather.temperatureC)}°C</strong>
                      <span>{air.weather.label}</span>
                      <span className="air-weather-feels">
                        Feels {Math.round(air.weather.apparentTemperatureC)}° · {air.weather.humidity}% humidity
                      </span>
                    </p>
                  )}
                </div>
                <button type="button" className="air-location-button" onClick={() => setSetupOpen(true)}>
                  <Icon name="pin" size={15} />
                  Change
                </button>
              </div>
              <AqiOrb air={air} loading={airLoading} />
              {air && (
                <p className="air-category-advice">{air.categoryLabel}. {advice?.alert ?? "Keep the low-effort habits that protect indoor air."}</p>
              )}
              <div className="air-card-footer">
                <span>Best outdoor window</span>
                <strong>{advice ? advice.windows.best.label : "Calculating…"}</strong>
              </div>
            </div>

            <div className="hero-note">
              <span className="hero-note-mark" aria-hidden="true">
                <Icon name="spark" size={18} />
              </span>
              <div>
                <span className="eyebrow">Your one thing</span>
                <p>{advice ? advice.topAction.title : "Finding the highest-impact move…"}</p>
                {advice && (
                  <a href="#playbook">
                    Open the playbook <Icon name="arrow-right" size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="impact-ribbon" aria-label="Today's headline estimates">
          <div className="ribbon-intro">
            <span className="eyebrow">Today at a glance</span>
            <p>{personalised ? "Tuned to your household." : "Demo household · Delhi."}</p>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--lime">
              <Icon name="shield" size={17} />
            </span>
            <div>
              <strong>{advice ? `≤${advice.ledger.exposurePct}%` : "—"}</strong>
              <span>modelled exposure cut</span>
            </div>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--sky">
              <Icon name="leaf" size={17} />
            </span>
            <div>
              <strong>{advice ? `${formatDecimal(advice.ledger.co2eKgMonth)} kg` : "—"}</strong>
              <span>CO₂e avoided / month</span>
            </div>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--cream">
              <Icon name="clock" size={17} />
            </span>
            <div>
              <strong>{advice ? advice.windows.best.label : "—"}</strong>
              <span>cleanest outdoor window</span>
            </div>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--clay">
              <Icon name="spark" size={17} />
            </span>
            <div>
              <strong>
                {advice
                  ? advice.ledger.costInrMonth >= 0
                    ? `${formatInr(advice.ledger.costInrMonth)} saved`
                    : `${formatInr(advice.ledger.costInrMonth)} cost`
                  : "—"}
              </strong>
              <span>estimated net / month</span>
            </div>
          </div>
          <button type="button" className="ribbon-edit" onClick={() => setSetupOpen(true)} aria-label="Edit household profile">
            <Icon name="arrow-right" size={18} />
          </button>
        </section>

        {!personalised && (
          <div className="demo-banner" role="note">
            <div>
              <span className="demo-dot" aria-hidden="true" />
              <p>
                <strong>You&apos;re seeing a demo household.</strong> Two adults, one child, one
                older adult in Delhi. Add your own details to make the plan truly yours.
              </p>
            </div>
            <button type="button" className="text-link" onClick={() => setSetupOpen(true)}>
              Personalise now <Icon name="arrow-right" size={15} />
            </button>
          </div>
        )}

        {air && advice ? (
          <>
            <Playbook profile={profile} air={air} advice={advice} />
            <ChoiceLab profile={profile} air={air} advice={advice} />
            <SwapsSection advice={advice} />
            <CommunitySection profile={profile} air={air} advice={advice} />
          </>
        ) : (
          <section className="section loading-section" aria-busy="true" aria-label="Loading today's plan">
            <div className="section-heading">
              <div>
                <span className="eyebrow">The daily playbook</span>
                <h2>Reading the sky over {profile.city.name}.</h2>
              </div>
            </div>
            <div className="loading-grid">
              <div className="loading-block loading-block--tall" />
              <div className="loading-block" />
              <div className="loading-block loading-block--tall" />
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <Logo />
            <p className="footer-tagline">
              Clearer choices for smoky seasons. Built for families, schools and the streets
              between them.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <a href="#playbook">Today</a>
            <a href="#choices">Choices lab</a>
            <a href="/dashboard">India dashboard</a>
            <button type="button" className="footer-nav-button" onClick={() => setAssistantOpen(true)}>
              Ask Saans
            </button>
            <a href="#community">Community kit</a>
          </nav>
          <div className="footer-source">
            <span className="eyebrow">Data & care</span>
            <p>
              Air quality from{" "}
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                Open-Meteo
              </a>
              , a free open-data service. AQI uses the US EPA scale.
            </p>
            <p>
              {air ? `Reading: ${formatObservedAt(air.observedAt)}.` : "Live reading loading."} Saans
              is not a medical device and does not provide diagnosis or treatment.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>saans means breath.</span>
          <span>No accounts · no tracking · profile stays in your browser</span>
          <span>Built with Next.js & TypeScript</span>
        </div>
      </footer>

      {air && advice && (
        <Assistant
          profile={profile}
          air={air}
          advice={advice}
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
        />
      )}

      <SetupDialog open={setupOpen} profile={profile} onClose={() => setSetupOpen(false)} onSave={saveProfile} />
    </div>
  );
}
