"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAirReading } from "@/hooks/useAirReading";
import { useClientValue } from "@/hooks/useClientValue";
import { useLocalizedAdvice } from "@/hooks/useLocalizedAdvice";
import { useStoredProfile } from "@/hooks/useStoredProfile";
import {
  alertDedupeKey,
  markAlertShown,
  sendLocalNotification,
  shouldAlert,
  wasAlertShown,
} from "@/lib/alerts";
import { formatObservedAt } from "@/lib/format";
import {
  completionFor,
  emptyHabits,
  HABITS_STORAGE_KEY,
  habitStreak,
  localDateKey,
  sanitiseHabits,
  saveHabits,
  toggleHabit,
  weeklySummary,
  type HabitState,
} from "@/lib/habits";
import { translate } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { AqiScaleToggle } from "./AqiScaleToggle";
import { Assistant } from "./Assistant";
import { ChoiceLab } from "./ChoiceLab";
import { CityPulse } from "./CityPulse";
import { HomeHero } from "./home/HomeHero";
import { ImpactRibbon } from "./home/ImpactRibbon";
import { SiteFooter } from "./home/SiteFooter";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Playbook } from "./Playbook";
import { usePreferences } from "./PreferencesProvider";
import { SettingsDialog } from "./SettingsDialog";
import { SetupDialog } from "./SetupDialog";
import { CommunitySection, SwapsSection } from "./SwapsSection";

function readRawHabits(): string | null {
  try {
    return window.localStorage.getItem(HABITS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseRawHabits(raw: string | null): HabitState {
  if (!raw) return emptyHabits();
  try {
    return sanitiseHabits(JSON.parse(raw));
  } catch {
    return emptyHabits();
  }
}

export function SaansApp() {
  const { settings } = usePreferences();
  const { profile, saveProfile: persistProfile, personalised, hydrated } = useStoredProfile();
  const { air, loading: airLoading, usedCached } = useAirReading(profile, hydrated);
  const advice = useLocalizedAdvice(profile, air, settings.aqiStandard, settings.locale);

  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const rawHabits = useClientValue(readRawHabits, null);
  const storedHabits = useMemo(() => parseRawHabits(rawHabits), [rawHabits]);
  const [habitsOverride, setHabitsOverride] = useState<HabitState | null>(null);
  const habits = habitsOverride ?? storedHabits;
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);

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
      setHabitsOverride((current) => {
        const next = toggleHabit(current ?? storedHabits, todayKey, actionId, planIds);
        saveHabits(next);
        return next;
      });
    },
    [advice, storedHabits, todayKey],
  );

  const currentAlertKey = advice ? alertDedupeKey(advice.measurement) : null;
  const alertVisible = Boolean(
    hydrated &&
      advice &&
      currentAlertKey &&
      dismissedAlertKey !== currentAlertKey &&
      shouldAlert(advice.measurement, settings.alerts),
  );

  useEffect(() => {
    if (!advice || !hydrated || !currentAlertKey) return;
    if (shouldAlert(advice.measurement, settings.alerts) && !wasAlertShown(currentAlertKey)) {
      markAlertShown(currentAlertKey);
      sendLocalNotification(
        "Saans air alert",
        `${advice.measurement.scaleLabel} is ${advice.measurement.value} in ${profile.city.name}. ${advice.topAction.title}.`,
      );
    }
  }, [advice, hydrated, currentAlertKey, settings.alerts, profile.city.name]);

  const saveProfile = useCallback(
    (next: Profile) => {
      persistProfile(next);
      setSetupOpen(false);
    },
    [persistProfile],
  );

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
            <Link href="/dashboard">{translate(settings.locale, "nav.dashboard")}</Link>
            <button type="button" className="nav-button" onClick={() => setAssistantOpen(true)}>
              {translate(settings.locale, "nav.ask")}
            </button>
            <a href="#community">{translate(settings.locale, "nav.community")}</a>
          </nav>
          <div className="header-actions">
            <AqiScaleToggle compact />
            <span className="live-pill" title="Air-quality data source">
              <span
                className={`source-dot ${air?.source === "open-meteo" ? "is-live" : ""}`}
                aria-hidden="true"
              />
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
            <button
              type="button"
              className="button button--dark button--small"
              onClick={() => setSetupOpen(true)}
            >
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
              onClick={() => setDismissedAlertKey(currentAlertKey)}
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
        <HomeHero
          profile={profile}
          air={air}
          airLoading={airLoading}
          advice={advice}
          locale={settings.locale}
          onOpenSetup={() => setSetupOpen(true)}
        />

        <ImpactRibbon
          advice={advice}
          personalised={personalised}
          locale={settings.locale}
          onOpenSetup={() => setSetupOpen(true)}
        />

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
          <section
            className="section loading-section"
            aria-busy="true"
            aria-label="Loading today's plan"
          >
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

      <SiteFooter air={air} onOpenAssistant={() => setAssistantOpen(true)} />

      {air && advice && (
        <Assistant
          profile={profile}
          air={air}
          advice={advice}
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
        />
      )}

      <SetupDialog
        open={setupOpen}
        profile={profile}
        onClose={() => setSetupOpen(false)}
        onSave={saveProfile}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        advice={advice}
        city={profile.city.name}
      />
    </div>
  );
}
