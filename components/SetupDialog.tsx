"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "@/lib/cities";
import { isIndianCity } from "@/lib/india";
import { sanitiseProfile } from "@/lib/validation";
import type { City, Priority, Profile } from "@/lib/types";
import { Icon } from "./Icon";

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

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <div className="stepper-field">
      <div>
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      <div className="stepper">
        <button
          type="button"
          className="stepper-button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Remove one ${label.toLowerCase()}`}
        >
          −
        </button>
        <output aria-live="polite" className="stepper-value" aria-label={`${label}: ${value}`}>
          {value}
        </output>
        <button
          type="button"
          className="stepper-button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Add one ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Choice<T extends string>({
  name,
  value,
  selected,
  onSelect,
  children,
}: {
  name: string;
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={`choice-pill ${selected ? "is-selected" : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
      />
      <span>{children}</span>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`toggle-pill ${checked ? "is-on" : ""}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-pill-mark" aria-hidden="true">
        {checked ? <Icon name="check" size={13} /> : null}
      </span>
      {children}
    </button>
  );
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "health", label: "Protect health" },
  { value: "planet", label: "Cut emissions" },
  { value: "cost", label: "Save money" },
  { value: "comfort", label: "Keep it simple" },
];

export function SetupDialog({ open, profile, onClose, onSave }: SetupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Profile>(() => cloneProfile(profile));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>(SUGGESTED_CITIES);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchNote, setSearchNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setDraft(cloneProfile(profile));
      setStep(1);
      setQuery("");
      setResults(SUGGESTED_CITIES);
      setSearchNote("");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => headingRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(SUGGESTED_CITIES);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search");
        const data = (await response.json()) as { results?: City[] };
        setResults(Array.isArray(data.results) ? data.results.slice(0, 7) : []);
        setSearchNote(data.results?.length ? "" : "No match. Try a district or nearby city.");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchNote("City search is unavailable. Pick a nearby city below.");
          setResults(SUGGESTED_CITIES);
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const activeCity = draft.city;
  const selectedCityLabel = useMemo(() => {
    const parts = [activeCity.name, activeCity.region, activeCity.country].filter(Boolean);
    return parts.join(", ");
  }, [activeCity]);

  function chooseCity(city: City) {
    setDraft((current) => ({ ...current, city }));
    setQuery("");
    setResults(SUGGESTED_CITIES);
    setSearchNote("");
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
        const city: City = {
          id: "my-location",
          name: "My neighbourhood",
          country: "Current location",
          latitude: Math.round(position.coords.latitude * 10000) / 10000,
          longitude: Math.round(position.coords.longitude * 10000) / 10000,
        };
        chooseCity(city);
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
    setDraft((current) => ({
      ...current,
      household: { ...current.household, [key]: value },
    }));
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
    const safe = sanitiseProfile({
      ...draft,
      displayName: draft.displayName.trim() || "Your household",
      updatedAt: new Date().toISOString(),
    });
    onSave(safe);
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
              <section aria-labelledby="setup-title">
                <span className="setup-illustration" aria-hidden="true">
                  <Icon name="pin" size={25} />
                </span>
                <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
                  Where does your household breathe?
                </h2>
                <p className="setup-lede">
                  Location sets today&apos;s air. Your household shape tells Saans who needs the
                  most protection.
                </p>

                <div className="field-block">
                  <label className="field-label" htmlFor="city-search">
                    City or district
                  </label>
                  <div className="city-search">
                    <Icon name="search" size={18} />
                    <input
                      id="city-search"
                      type="search"
                      autoComplete="off"
                      placeholder="Search Delhi, Mumbai, Patna…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      aria-describedby="city-search-note"
                    />
                    {searching && <span className="search-spinner" aria-hidden="true" />}
                  </div>
                  <p id="city-search-note" className="field-hint" aria-live="polite">
                    {searchNote || `Selected: ${selectedCityLabel}`}
                  </p>

                  <div className="city-results" aria-label="City results">
                    {results.map((city) => (
                      <button
                        key={`${city.id}-${city.name}`}
                        type="button"
                        aria-pressed={activeCity.id === city.id}
                        className={`city-result ${activeCity.id === city.id ? "is-selected" : ""}`}
                        onClick={() => chooseCity(city)}
                      >
                        <span>
                          <strong>{city.name}</strong>
                          <small>{[city.region, city.country].filter(Boolean).join(", ")}</small>
                        </span>
                        {activeCity.id === city.id ? <Icon name="check" size={17} /> : null}
                      </button>
                    ))}
                  </div>

                  <button type="button" className="location-button" onClick={useLocation} disabled={locating}>
                    <Icon name="locate" size={17} />
                    {locating ? "Finding your location…" : "Use my current location"}
                  </button>
                  <p className="privacy-note">
                    Coordinates are used only to fetch air quality. Saans stores nothing on a server.
                  </p>
                </div>

                <div className="field-block">
                  <span className="field-label">Who lives at home?</span>
                  <div className="stepper-grid">
                    <Stepper
                      label="Adults"
                      value={draft.household.adults}
                      min={1}
                      max={12}
                      onChange={(value) => updateHousehold("adults", value)}
                    />
                    <Stepper
                      label="Children"
                      value={draft.household.children}
                      min={0}
                      max={12}
                      onChange={(value) => updateHousehold("children", value)}
                      hint="Under 18"
                    />
                    <Stepper
                      label="Older adults"
                      value={draft.household.elders}
                      min={0}
                      max={8}
                      onChange={(value) => updateHousehold("elders", value)}
                      hint="60+"
                    />
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="setup-title">
                <span className="setup-illustration" aria-hidden="true">
                  <Icon name="home" size={25} />
                </span>
                <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
                  What does your indoor air face?
                </h2>
                <p className="setup-lede">
                  Most exposure happens indoors. These choices let Saans separate the smoke you
                  can control from the smog you cannot.
                </p>

                <fieldset className="field-block">
                  <legend className="field-label">Extra care needed</legend>
                  <div className="toggle-row">
                    <Toggle
                      checked={draft.household.respiratory}
                      onChange={(value) => updateHousehold("respiratory", value)}
                    >
                      Asthma or other respiratory condition
                    </Toggle>
                    <Toggle
                      checked={draft.household.pregnant}
                      onChange={(value) => updateHousehold("pregnant", value)}
                    >
                      Pregnancy
                    </Toggle>
                    <Toggle
                      checked={draft.household.pets}
                      onChange={(value) => updateHousehold("pets", value)}
                    >
                      Pets at home
                    </Toggle>
                  </div>
                </fieldset>

                <fieldset className="field-block">
                  <legend className="field-label">Main cooking fuel</legend>
                  <div className="choice-grid choice-grid--four">
                    <Choice
                      name="cooking"
                      value="lpg"
                      selected={draft.home.cookingFuel === "lpg"}
                      onSelect={(value) => updateHome("cookingFuel", value)}
                    >
                      LPG cylinder
                    </Choice>
                    <Choice
                      name="cooking"
                      value="piped-gas"
                      selected={draft.home.cookingFuel === "piped-gas"}
                      onSelect={(value) => updateHome("cookingFuel", value)}
                    >
                      Piped gas
                    </Choice>
                    <Choice
                      name="cooking"
                      value="electric"
                      selected={draft.home.cookingFuel === "electric"}
                      onSelect={(value) => updateHome("cookingFuel", value)}
                    >
                      Electric / induction
                    </Choice>
                    <Choice
                      name="cooking"
                      value="biomass"
                      selected={draft.home.cookingFuel === "biomass"}
                      onSelect={(value) => updateHome("cookingFuel", value)}
                    >
                      Wood, coal or dung
                    </Choice>
                  </div>
                </fieldset>

                <fieldset className="field-block">
                  <legend className="field-label">Smoke you create indoors</legend>
                  <div className="choice-grid choice-grid--four">
                    <Choice
                      name="smoke"
                      value="none"
                      selected={draft.home.indoorSmoke === "none"}
                      onSelect={(value) => updateHome("indoorSmoke", value)}
                    >
                      None
                    </Choice>
                    <Choice
                      name="smoke"
                      value="incense"
                      selected={draft.home.indoorSmoke === "incense"}
                      onSelect={(value) => updateHome("indoorSmoke", value)}
                    >
                      Incense / coils
                    </Choice>
                    <Choice
                      name="smoke"
                      value="coal"
                      selected={draft.home.indoorSmoke === "coal"}
                      onSelect={(value) => updateHome("indoorSmoke", value)}
                    >
                      Coal / charcoal
                    </Choice>
                    <Choice
                      name="smoke"
                      value="wood"
                      selected={draft.home.indoorSmoke === "wood"}
                      onSelect={(value) => updateHome("indoorSmoke", value)}
                    >
                      Wood fire
                    </Choice>
                  </div>
                </fieldset>

                <fieldset className="field-block">
                  <legend className="field-label">Air purifier at home</legend>
                  <div className="choice-grid choice-grid--three">
                    <Choice
                      name="purifier"
                      value="none"
                      selected={draft.home.purifier === "none"}
                      onSelect={(value) => updateHome("purifier", value)}
                    >
                      None yet
                    </Choice>
                    <Choice
                      name="purifier"
                      value="one"
                      selected={draft.home.purifier === "one"}
                      onSelect={(value) => updateHome("purifier", value)}
                    >
                      One purifier
                    </Choice>
                    <Choice
                      name="purifier"
                      value="multiple"
                      selected={draft.home.purifier === "multiple"}
                      onSelect={(value) => updateHome("purifier", value)}
                    >
                      Two or more
                    </Choice>
                  </div>
                </fieldset>
              </section>
            )}

            {step === 3 && (
              <section aria-labelledby="setup-title">
                <span className="setup-illustration" aria-hidden="true">
                  <Icon name="mobility" size={25} />
                </span>
                <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
                  How does your week move?
                </h2>
                <p className="setup-lede">
                  Commutes are where many households meet their highest pollution. Saans uses this
                  to suggest a cleaner route, not a guilt trip.
                </p>

                <fieldset className="field-block">
                  <legend className="field-label">Usual way to get around</legend>
                  <div className="choice-grid choice-grid--three">
                    {(
                      [
                        ["walk", "Walk"],
                        ["cycle", "Cycle"],
                        ["two-wheeler", "Two-wheeler"],
                        ["car", "Car"],
                        ["bus", "Bus"],
                        ["metro", "Metro"],
                      ] as const
                    ).map(([value, label]) => (
                      <Choice
                        key={value}
                        name="mobility"
                        value={value}
                        selected={draft.mobility.primary === value}
                        onSelect={(next) => updateMobility("primary", next)}
                      >
                        {label}
                      </Choice>
                    ))}
                  </div>
                </fieldset>

                <div className="field-block slider-block">
                  <label className="field-label" htmlFor="commute-minutes">
                    One-way commute <output htmlFor="commute-minutes">{draft.mobility.commuteMinutes} min</output>
                  </label>
                  <input
                    id="commute-minutes"
                    type="range"
                    min={0}
                    max={120}
                    step={5}
                    value={draft.mobility.commuteMinutes}
                    onChange={(event) => updateMobility("commuteMinutes", Number(event.target.value))}
                  />
                  <div className="range-labels" aria-hidden="true">
                    <span>At home</span>
                    <span>2 hours</span>
                  </div>
                </div>

                <div className="toggle-row toggle-row--stack">
                  <Toggle
                    checked={draft.mobility.schoolRun}
                    onChange={(value) => updateMobility("schoolRun", value)}
                  >
                    I do a school run
                  </Toggle>
                  <Toggle
                    checked={draft.mobility.workFromHomeDays > 1}
                    onChange={(value) => updateMobility("workFromHomeDays", value ? 2 : 0)}
                  >
                    I can work from home on smog days
                  </Toggle>
                </div>

                <fieldset className="field-block">
                  <legend className="field-label">Budget for changes</legend>
                  <div className="choice-grid choice-grid--three">
                    <Choice
                      name="budget"
                      value="lean"
                      selected={draft.budget === "lean"}
                      onSelect={(value) => setDraft((current) => ({ ...current, budget: value }))}
                    >
                      Keep it free
                    </Choice>
                    <Choice
                      name="budget"
                      value="balanced"
                      selected={draft.budget === "balanced"}
                      onSelect={(value) => setDraft((current) => ({ ...current, budget: value }))}
                    >
                      A little to spend
                    </Choice>
                    <Choice
                      name="budget"
                      value="comfortable"
                      selected={draft.budget === "comfortable"}
                      onSelect={(value) => setDraft((current) => ({ ...current, budget: value }))}
                    >
                      Invest for comfort
                    </Choice>
                  </div>
                </fieldset>

                <fieldset className="field-block">
                  <legend className="field-label">What should Saans optimise for?</legend>
                  <div className="toggle-row">
                    {PRIORITY_OPTIONS.map((option) => (
                      <Toggle
                        key={option.value}
                        checked={draft.priorities.includes(option.value)}
                        onChange={() => togglePriority(option.value)}
                      >
                        {option.label}
                      </Toggle>
                    ))}
                  </div>
                </fieldset>
              </section>
            )}
          </div>

          <div className="setup-actions">
            {step > 1 ? (
              <button type="button" className="button button--quiet" onClick={() => setStep(step - 1)}>
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
