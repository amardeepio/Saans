"use client";

import type { RefObject } from "react";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { Locale, Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Choice, Toggle } from "./FormControls";

interface IndoorStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  draft: Profile;
  locale: Locale;
  onUpdateHousehold: (key: keyof Profile["household"], value: number | boolean) => void;
  onUpdateHome: <Key extends keyof Profile["home"]>(key: Key, value: Profile["home"][Key]) => void;
}

const COOKING_OPTIONS = [
  ["lpg", "setup.lpg"],
  ["piped-gas", "setup.piped"],
  ["electric", "setup.electric"],
  ["biomass", "setup.biomass"],
] as const satisfies ReadonlyArray<readonly [Profile["home"]["cookingFuel"], TranslationKey]>;

const SMOKE_OPTIONS = [
  ["none", "setup.none"],
  ["incense", "setup.incense"],
  ["coal", "setup.coal"],
  ["wood", "setup.wood"],
] as const satisfies ReadonlyArray<readonly [Profile["home"]["indoorSmoke"], TranslationKey]>;

const PURIFIER_OPTIONS = [
  ["none", "setup.noPurifier"],
  ["one", "setup.onePurifier"],
  ["multiple", "setup.multiplePurifier"],
] as const satisfies ReadonlyArray<readonly [Profile["home"]["purifier"], TranslationKey]>;

export function IndoorStep({
  headingRef,
  draft,
  locale,
  onUpdateHousehold,
  onUpdateHome,
}: IndoorStepProps) {
  return (
    <section aria-labelledby="setup-title">
      <span className="setup-illustration" aria-hidden="true">
        <Icon name="home" size={25} />
      </span>
      <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
        {translate(locale, "setup.indoorTitle")}
      </h2>
      <p className="setup-lede">{translate(locale, "setup.indoorLede")}</p>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.extraCare")}</legend>
        <div className="toggle-row">
          <Toggle
            checked={draft.household.respiratory}
            onChange={(value) => onUpdateHousehold("respiratory", value)}
          >
            {translate(locale, "setup.respiratory")}
          </Toggle>
          <Toggle
            checked={draft.household.pregnant}
            onChange={(value) => onUpdateHousehold("pregnant", value)}
          >
            {translate(locale, "setup.pregnant")}
          </Toggle>
          <Toggle
            checked={draft.household.pets}
            onChange={(value) => onUpdateHousehold("pets", value)}
          >
            {translate(locale, "setup.pets")}
          </Toggle>
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.fuel")}</legend>
        <div className="choice-grid choice-grid--four">
          {COOKING_OPTIONS.map(([value, key]) => (
            <Choice
              key={value}
              name="cooking"
              value={value}
              selected={draft.home.cookingFuel === value}
              onSelect={(next) => onUpdateHome("cookingFuel", next)}
            >
              {translate(locale, key)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.smoke")}</legend>
        <div className="choice-grid choice-grid--four">
          {SMOKE_OPTIONS.map(([value, key]) => (
            <Choice
              key={value}
              name="smoke"
              value={value}
              selected={draft.home.indoorSmoke === value}
              onSelect={(next) => onUpdateHome("indoorSmoke", next)}
            >
              {translate(locale, key)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.purifier")}</legend>
        <div className="choice-grid choice-grid--three">
          {PURIFIER_OPTIONS.map(([value, key]) => (
            <Choice
              key={value}
              name="purifier"
              value={value}
              selected={draft.home.purifier === value}
              onSelect={(next) => onUpdateHome("purifier", next)}
            >
              {translate(locale, key)}
            </Choice>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
