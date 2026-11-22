"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCitySearch } from "@/hooks/useCitySearch";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { CITIES } from "@/lib/cities";
import { isIndianCity } from "@/lib/india";
import type { City, Priority, Profile } from "@/lib/types";
import { sanitiseProfile } from "@/lib/validation";
import { Icon } from "./Icon";
import { IndoorStep } from "./setup/IndoorStep";
import { LocationStep } from "./setup/LocationStep";
import { RoutineStep } from "./setup/RoutineStep";

interface SetupDialogProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (profile: Profile) => void;
}

/** Default chooser grid: Indian cities only, so no cross-border rows appear. */
const SUGGESTED_CITIES = CITIES.filter(isIndianCity).slice(0, 6);

function cloneProfile(profile: Profile): Profile {
  return JSON.parse(JSON.stringify(profile)) as Profile;
}

export function SetupDialog({ open, profile, onClose, onSave }: SetupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Profile>(() => cloneProfile(profile));
  const [locating, setLocating] = useState(false);

  const {
    query,
    setQuery,
    results,
    searching,
    searchNote,
    setSearchNote,
    selectQuerySilently,
  } = useCitySearch({ debounceMs: 350 });

  useDialogFocus(open, dialogRef);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setDraft(cloneProfile(profile));
      setStep(1);
      selectQuerySilently("");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, profile, selectQuerySilently]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => headingRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  const displayedResults = query.trim().length >= 2 ? results : SUGGESTED_CITIES;
  const selectedCityLabel = useMemo(() => {
    const { name, region, country } = draft.city;
    return [name, region, country].filter(Boolean).join(", ");
  }, [draft.city]);

  function chooseCity(city: City) {
    setDraft((current) => ({ ...current, city }));
    selectQuerySilently("");
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setSearchNote("Location is not available in this browser. Search for your city instead.");
      return;
    }
    setLocating(true);
    setSearchNote("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        chooseCity({
          id: "my-location",
          name: "My neighbourhood",
          country: "Current location",
          latitude: Math.round(position.coords.latitude * 10000) / 10000,
          longitude: Math.round(position.coords.longitude * 10000) / 10000,
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setSearchNote("Location permission was not given. Search for your city instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }

  function updateHousehold(key: keyof Profile["household"], value: number | boolean) {
    setDraft((current) => ({ ...current, household: { ...current.household, [key]: value } }));
  }

  function updateHome<Key extends keyof Profile["home"]>(key: Key, value: Profile["home"][Key]) {
    setDraft((current) => ({ ...current, home: { ...current.home, [key]: value } }));
  }

  function updateMobility<Key extends keyof Profile["mobility"]>(
    key: Key,
    value: Profile["mobility"][Key],
  ) {
    setDraft((current) => ({ ...current, mobility: { ...current.mobility, [key]: value } }));
  }

  function togglePriority(priority: Priority) {
    setDraft((current) => {
      const has = current.priorities.includes(priority);
      const next = has
        ? current.priorities.filter((item) => item !== priority)
        : [...current.priorities, priority].slice(-4);
      return { ...current, priorities: next.length ? next : [priority] };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    onSave(
      sanitiseProfile({
        ...draft,
        displayName: draft.displayName.trim() || "Your household",
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="setup-dialog"
      aria-labelledby="setup-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="setup-shell" onClick={(event) => event.stopPropagation()}>
        <div className="setup-top">
          <div>
            <span className="eyebrow">Your household</span>
            <p className="setup-step-count">Step {step} of 3</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close setup">
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="setup-progress" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <span key={item} className={item <= step ? "is-filled" : ""} />
          ))}
        </div>

        <form onSubmit={submit} noValidate>
          <div className="setup-content">
            {step === 1 && (
              <LocationStep
                headingRef={headingRef}
                draft={draft}
                query={query}
                onQueryChange={setQuery}
                results={displayedResults}
                searching={searching}
                searchNote={searchNote}
                selectedCityLabel={selectedCityLabel}
                locating={locating}
                onChooseCity={chooseCity}
                onUseLocation={useLocation}
                onUpdateHousehold={updateHousehold}
              />
            )}
            {step === 2 && (
              <IndoorStep
                headingRef={headingRef}
                draft={draft}
                onUpdateHousehold={updateHousehold}
                onUpdateHome={updateHome}
              />
            )}
            {step === 3 && (
              <RoutineStep
                headingRef={headingRef}
                draft={draft}
                onUpdateMobility={updateMobility}
                onUpdateBudget={(budget) => setDraft((current) => ({ ...current, budget }))}
                onTogglePriority={togglePriority}
              />
            )}
          </div>

          <div className="setup-actions">
            {step > 1 ? (
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="button button--dark">
              {step < 3 ? "Continue" : "Build my plan"}
              <Icon name={step < 3 ? "arrow-right" : "spark"} size={17} />
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
