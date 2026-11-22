"use client";

import type { RefObject } from "react";
import { translate } from "@/lib/i18n";
import type { City, Locale, Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Stepper } from "./FormControls";

interface LocationStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  draft: Profile;
  locale: Locale;
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
  locale,
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
        {translate(locale, "setup.cityTitle")}
      </h2>
      <p className="setup-lede">{translate(locale, "setup.cityLede")}</p>

      <div className="field-block">
        <label className="field-label" htmlFor="city-search">
          {translate(locale, "setup.cityLabel")}
        </label>
        <div className="city-search">
          <Icon name="search" size={18} />
          <input
            id="city-search"
            type="search"
            autoComplete="off"
            placeholder={translate(locale, "setup.cityPlaceholder")}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-describedby="city-search-note"
          />
          {searching && <span className="search-spinner" aria-hidden="true" />}
        </div>
        <p id="city-search-note" className="field-hint" aria-live="polite">
          {searchNote || `${translate(locale, "setup.selected")}: ${selectedCityLabel}`}
        </p>

        <div className="city-results" aria-label={translate(locale, "setup.cityResults")}>
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
          {locating
            ? translate(locale, "setup.locating")
            : translate(locale, "setup.useLocation")}
        </button>
        <p className="privacy-note">{translate(locale, "setup.privacy")}</p>
      </div>

      <div className="field-block">
        <span className="field-label">{translate(locale, "setup.whoLives")}</span>
        <div className="stepper-grid">
          <Stepper
            label={translate(locale, "setup.adults")}
            locale={locale}
            value={draft.household.adults}
            min={1}
            max={12}
            onChange={(value) => onUpdateHousehold("adults", value)}
          />
          <Stepper
            label={translate(locale, "setup.children")}
            locale={locale}
            value={draft.household.children}
            min={0}
            max={12}
            onChange={(value) => onUpdateHousehold("children", value)}
            hint={translate(locale, "setup.under18")}
          />
          <Stepper
            label={translate(locale, "setup.elders")}
            locale={locale}
            value={draft.household.elders}
            min={0}
            max={8}
            onChange={(value) => onUpdateHousehold("elders", value)}
            hint={translate(locale, "setup.over60")}
          />
        </div>
      </div>
    </section>
  );
}
