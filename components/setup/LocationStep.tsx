"use client";

import type { RefObject } from "react";
import type { City, Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Stepper } from "./FormControls";

interface LocationStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  draft: Profile;
  query: string;
  onQueryChange: (value: string) => void;
  results: City[];
  searching: boolean;
  searchNote: string;
  selectedCityLabel: string;
  locating: boolean;
  onChooseCity: (city: City) => void;
  onUseLocation: () => void;
  onUpdateHousehold: (key: keyof Profile["household"], value: number | boolean) => void;
}

export function LocationStep({
  headingRef,
  draft,
  query,
  onQueryChange,
  results,
  searching,
  searchNote,
  selectedCityLabel,
  locating,
  onChooseCity,
  onUseLocation,
  onUpdateHousehold,
}: LocationStepProps) {
  const activeCity = draft.city;

  return (
    <section aria-labelledby="setup-title">
      <span className="setup-illustration" aria-hidden="true">
        <Icon name="pin" size={25} />
      </span>
      <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
        Where does your household breathe?
      </h2>
      <p className="setup-lede">
        Location sets today&apos;s air. Your household shape tells Saans who needs the most
        protection.
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
            onChange={(event) => onQueryChange(event.target.value)}
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
              onClick={() => onChooseCity(city)}
            >
              <span>
                <strong>{city.name}</strong>
                <small>{[city.region, city.country].filter(Boolean).join(", ")}</small>
              </span>
              {activeCity.id === city.id ? <Icon name="check" size={17} /> : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="location-button"
          onClick={onUseLocation}
          disabled={locating}
        >
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
            onChange={(value) => onUpdateHousehold("adults", value)}
          />
          <Stepper
            label="Children"
            value={draft.household.children}
            min={0}
            max={12}
            onChange={(value) => onUpdateHousehold("children", value)}
            hint="Under 18"
          />
          <Stepper
            label="Older adults"
            value={draft.household.elders}
            min={0}
            max={8}
            onChange={(value) => onUpdateHousehold("elders", value)}
            hint="60+"
          />
        </div>
      </div>
    </section>
  );
}
