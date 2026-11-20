"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  alertDedupeKey,
  markAlertShown,
  sendLocalNotification,
  shouldAlert,
  wasAlertShown,
} from "@/lib/alerts";
import { DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { formatDecimal, formatInr, formatNumber, formatObservedAt } from "@/lib/format";
import {
  completionFor,
  emptyHabits,
  habitStreak,
  loadHabits,
  localDateKey,
  saveHabits,
  toggleHabit,
  weeklySummary,
  type HabitState,
} from "@/lib/habits";
import { translate } from "@/lib/i18n";
import { applyAdviceTranslations, collectAdviceStrings } from "@/lib/localize-advice";
import { cacheReading, getCachedReading } from "@/lib/offline";
import { sampleReading } from "@/lib/sample-air";
import type { Advice, AirReading, Profile } from "@/lib/types";
import {
  deserialiseProfile,
  PROFILE_STORAGE_KEY,
  sanitiseAirReading,
  serialiseProfile,
} from "@/lib/validation";
import { AqiOrb } from "./AqiOrb";
import { AqiScaleToggle } from "./AqiScaleToggle";
import { Assistant } from "./Assistant";
import { ChoiceLab } from "./ChoiceLab";
import { CityPulse } from "./CityPulse";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Playbook } from "./Playbook";
import { usePreferences } from "./PreferencesProvider";
import { SettingsDialog } from "./SettingsDialog";
import { ShareRow } from "./ShareRow";
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
  const { settings } = usePreferences();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [personalised, setPersonalised] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [air, setAir] = useState<AirReading | null>(null);
  const [airLoading, setAirLoading] = useState(true);
  const [usedCached, setUsedCached] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [habits, setHabits] = useState<HabitState>(() => emptyHabits());
  const [habitsReady, setHabitsReady] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = deserialiseProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY));
    if (saved) {
      setProfile(saved);
      setPersonalised(true);
    }
    setHabits(loadHabits());
    setHabitsReady(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setAirLoading(true);
    setAir(null);
    setUsedCached(false);

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
        if (controller.signal.aborted) return;
        setAir(reading);
        cacheReading(reading);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        const cached = getCachedReading(profile.city.id);
        if (cached) {
          setAir(cached);
          setUsedCached(true);
        } else {
          setAir(sampleReading(profile.city));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAirLoading(false);
      });

    return () => controller.abort();
  }, [hydrated, profile.city]);

  const baseAdvice = useMemo(
    () => (air ? buildAdvice(profile, air, settings.aqiStandard) : null),
    [profile, air, settings.aqiStandard],
  );
  const [localizedAdvice, setLocalizedAdvice] = useState<Advice | null>(null);

  useEffect(() => {
    if (!baseAdvice || settings.locale === "en") {
      setLocalizedAdvice(null);
      return;
    }
    let cancelled = false;
    const texts = collectAdviceStrings(baseAdvice);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target: "hi" }),
      signal: AbortSignal.timeout(20_000),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { translations?: string[] };
      })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.translations) && data.translations.length === texts.length) {
          setLocalizedAdvice(applyAdviceTranslations(baseAdvice, data.translations));
        }
      })
      .catch(() => {
        if (!cancelled) setLocalizedAdvice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [baseAdvice, settings.locale]);

  const advice = localizedAdvice ?? baseAdvice;

  const todayKey = localDateKey();
  const todayCompletion = useMemo(
    () =>
      advice
        ? completionFor(
            habits,
            todayKey,
            advice.actions.map((action) => action.id),
          )
        : { completed: [], total: 0, percent: 0 },
    [habits, todayKey, advice],
  );
  const streak = useMemo(() => habitStreak(habits, todayKey), [habits, todayKey]);
  const week = useMemo(() => weeklySummary(habits, todayKey), [habits, todayKey]);

  const toggleAction = useCallback(
    (actionId: string) => {
      if (!advice) return;
      const planIds = advice.actions.map((action) => action.id);
      setHabits((current) => {
        const next = toggleHabit(current, todayKey, actionId, planIds);
        saveHabits(next);
        return next;
      });
    },
    [advice, todayKey],
  );

  useEffect(() => {
    if (!advice || !habitsReady) return;
    const key = alertDedupeKey(advice.measurement);
    if (shouldAlert(advice.measurement, settings.alerts) && !wasAlertShown(key)) {
      setAlertVisible(true);
      markAlertShown(key);
      sendLocalNotification(
        "Saans air alert",
        `${advice.measurement.scaleLabel} is ${advice.measurement.value} in ${profile.city.name}. ${advice.topAction.title}.`,
      );
    }
  }, [advice, habitsReady, settings.alerts, profile.city.name]);

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

  const sourceNote = usedCached
    ? `${translate(settings.locale, "offline.cached")} · ${air ? formatObservedAt(air.observedAt) : ""}`
    : air?.source === "open-meteo"
      ? translate(settings.locale, "header.live")
      : air
        ? translate(settings.locale, "header.sample")
        : translate(settings.locale, "header.reading");

  return (
    <div id="top" className="app-shell">
      <a className="skip-link" href="#playbook">
        {translate(settings.locale, "hero.seePlan")}
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="brand" aria-label={translate(settings.locale, "brand.home")}>
            <Logo />
          </a>
          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#playbook">{translate(settings.locale, "nav.today")}</a>
            <a href="#choices">{translate(settings.locale, "nav.choices")}</a>
            <a href="/dashboard">{translate(settings.locale, "nav.dashboard")}</a>
            <button type="button" className="nav-button" onClick={() => setAssistantOpen(true)}>
              {translate(settings.locale, "nav.ask")}
            </button>
            <a href="#community">{translate(settings.locale, "nav.community")}</a>
          </nav>
          <div className="header-actions">
            <AqiScaleToggle compact />
            <span className="live-pill" title="Air-quality data source">
              <span className={`source-dot ${air?.source === "open-meteo" ? "is-live" : ""}`} aria-hidden="true" />
              {sourceNote}
            </span>
            <button
              type="button"
              className="icon-button header-settings"
              onClick={() => setSettingsOpen(true)}
              aria-label={translate(settings.locale, "settings.title")}
            >
              <Icon name="settings" size={18} />
            </button>
            <button type="button" className="button button--dark button--small" onClick={() => setSetupOpen(true)}>
              <Icon name="pin" size={15} />
              {personalised
                ? translate(settings.locale, "header.editProfile")
                : translate(settings.locale, "header.makeMine")}
            </button>
          </div>
        </div>
      </header>

      {alertVisible && advice && (
        <div className="threshold-banner" role="status" aria-live="polite">
          <span>
            <Icon name="shield" size={16} />
            {translate(settings.locale, "alert.banner")} {advice.measurement.scaleLabel}{" "}
            {advice.measurement.value}.
          </span>
          <div>
            <a href="#playbook" className="text-link">
              {translate(settings.locale, "alert.bannerCta")}
            </a>
            <button
              type="button"
              className="banner-close"
              onClick={() => setAlertVisible(false)}
              aria-label={translate(settings.locale, "common.close")}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

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
              {translate(settings.locale, "hero.eyebrow")}
            </div>
            <h1 id="hero-title">
              {translate(settings.locale, "hero.titleA")}
              <br />
              {translate(settings.locale, "hero.titleB")}
            </h1>
            <p className="hero-lede">{translate(settings.locale, "hero.lede")}</p>
            {advice && (
              <div className="hero-share">
                <ShareRow
                  title={`${profile.city.name}${profile.city.region ? `, ${profile.city.region}` : ""}`}
                  value={advice.measurement.value}
                  scaleLabel={advice.measurement.scaleLabel}
                  label={advice.measurement.label}
                  windowLabel={advice.windows.best.label}
                />
              </div>
            )}
            <div className="hero-actions">
              <a className="button button--dark" href="#playbook">
                {translate(settings.locale, "hero.seePlan")}
                <Icon name="arrow" size={18} />
              </a>
              <button type="button" className="button button--quiet" onClick={() => setSetupOpen(true)}>
                <Icon name="users" size={17} />
                {translate(settings.locale, "hero.personalise")}
              </button>
            </div>
            <div className="hero-trust">
              <span>
                <Icon name="shield" size={15} /> {translate(settings.locale, "hero.noAccount")}
              </span>
              <span>
                <Icon name="wind" size={15} /> {translate(settings.locale, "hero.location")}
              </span>
              <span>
                <Icon name="leaf" size={15} /> {translate(settings.locale, "hero.impact")}
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="air-card">
              <div className="air-card-head">
                <div>
                  <span className="eyebrow">{translate(settings.locale, "hero.airNow")}</span>
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
                  {translate(settings.locale, "hero.change")}
                </button>
              </div>
              <AqiOrb air={air} loading={airLoading} />
              {air && advice && (
                <p className="air-category-advice">
                  {advice.measurement.label}. {advice.alert ?? advice.atmosphere.ventilationAdvice}
                </p>
              )}
              <div className="air-card-footer">
                <span>{translate(settings.locale, "hero.bestWindow")}</span>
                <strong>{advice ? advice.windows.best.label : translate(settings.locale, "common.loading")}</strong>
              </div>
            </div>

            <div className="hero-note">
              <span className="hero-note-mark" aria-hidden="true">
                <Icon name="spark" size={18} />
              </span>
              <div>
                <span className="eyebrow">{translate(settings.locale, "hero.oneThing")}</span>
                <p>{advice ? advice.topAction.title : translate(settings.locale, "common.loading")}</p>
                {advice && (
                  <a href="#playbook">
                    {translate(settings.locale, "hero.openPlaybook")} <Icon name="arrow-right" size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="impact-ribbon" aria-label="Today's headline estimates">
          <div className="ribbon-intro">
            <span className="eyebrow">{translate(settings.locale, "ribbon.title")}</span>
            <p>
              {personalised
                ? translate(settings.locale, "ribbon.tuned")
                : translate(settings.locale, "ribbon.demo")}
            </p>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--lime">
              <Icon name="shield" size={17} />
            </span>
            <div>
              <strong>{advice ? `≤${advice.ledger.exposurePct}%` : "—"}</strong>
              <span>{translate(settings.locale, "ribbon.exposure")}</span>
            </div>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--sky">
              <Icon name="leaf" size={17} />
            </span>
            <div>
              <strong>{advice ? `${formatDecimal(advice.ledger.co2eKgMonth)} kg` : "—"}</strong>
              <span>{translate(settings.locale, "ribbon.carbon")}</span>
            </div>
          </div>
          <div className="ribbon-stat">
            <span className="ribbon-icon ribbon-icon--cream">
              <Icon name="clock" size={17} />
            </span>
            <div>
              <strong>{advice ? advice.windows.best.label : "—"}</strong>
              <span>{translate(settings.locale, "ribbon.window")}</span>
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
                    ? `${formatInr(advice.ledger.costInrMonth)} ${translate(settings.locale, "ribbon.saved")}`
                    : `${formatInr(advice.ledger.costInrMonth)} ${translate(settings.locale, "ribbon.costLabel")}`
                  : "—"}
              </strong>
              <span>{translate(settings.locale, "ribbon.cost")}</span>
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
                <strong>{translate(settings.locale, "demo.title")}</strong>{" "}
                {translate(settings.locale, "demo.body")}
              </p>
            </div>
            <button type="button" className="text-link" onClick={() => setSetupOpen(true)}>
              {translate(settings.locale, "demo.cta")} <Icon name="arrow-right" size={15} />
            </button>
          </div>
        )}

        {air && advice ? (
          <>
            <Playbook
              profile={profile}
              air={air}
              advice={advice}
              completed={todayCompletion.completed}
              onToggle={toggleAction}
              streak={streak}
              week={week}
            />
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
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        advice={advice}
        city={profile.city.name}
      />
    </div>
  );
}
