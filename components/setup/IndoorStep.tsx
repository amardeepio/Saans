"use client";

import type { RefObject } from "react";
import type { Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Choice, Toggle } from "./FormControls";

interface IndoorStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  draft: Profile;
  onUpdateHousehold: (key: keyof Profile["household"], value: number | boolean) => void;
  onUpdateHome: <Key extends keyof Profile["home"]>(key: Key, value: Profile["home"][Key]) => void;
}

const COOKING_OPTIONS = [
  ["lpg", "LPG cylinder"],
  ["piped-gas", "Piped gas"],
  ["electric", "Electric / induction"],
  ["biomass", "Wood, coal or dung"],
] as const;

const SMOKE_OPTIONS = [
  ["none", "None"],
  ["incense", "Incense / coils"],
  ["coal", "Coal / charcoal"],
  ["wood", "Wood fire"],
] as const;

const PURIFIER_OPTIONS = [
  ["none", "None yet"],
  ["one", "One purifier"],
  ["multiple", "Two or more"],
] as const;

export function IndoorStep({
  headingRef,
  draft,
  onUpdateHousehold,
  onUpdateHome,
}: IndoorStepProps) {
  return (
    <section aria-labelledby="setup-title">
      <span className="setup-illustration" aria-hidden="true">
        <Icon name="home" size={25} />
      </span>
      <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
        What does your indoor air face?
      </h2>
      <p className="setup-lede">
        Most exposure happens indoors. These choices let Saans separate the smoke you can control
        from the smog you cannot.
      </p>

      <fieldset className="field-block">
        <legend className="field-label">Extra care needed</legend>
        <div className="toggle-row">
          <Toggle
            checked={draft.household.respiratory}
            onChange={(value) => onUpdateHousehold("respiratory", value)}
          >
            Asthma or other respiratory condition
          </Toggle>
          <Toggle
            checked={draft.household.pregnant}
            onChange={(value) => onUpdateHousehold("pregnant", value)}
          >
            Pregnancy
          </Toggle>
          <Toggle
            checked={draft.household.pets}
            onChange={(value) => onUpdateHousehold("pets", value)}
          >
            Pets at home
          </Toggle>
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">Main cooking fuel</legend>
        <div className="choice-grid choice-grid--four">
          {COOKING_OPTIONS.map(([value, label]) => (
            <Choice
              key={value}
              name="cooking"
              value={value}
              selected={draft.home.cookingFuel === value}
              onSelect={(next) => onUpdateHome("cookingFuel", next)}
            >
              {label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">Smoke you create indoors</legend>
        <div className="choice-grid choice-grid--four">
          {SMOKE_OPTIONS.map(([value, label]) => (
            <Choice
              key={value}
              name="smoke"
              value={value}
              selected={draft.home.indoorSmoke === value}
              onSelect={(next) => onUpdateHome("indoorSmoke", next)}
            >
              {label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">Air purifier at home</legend>
        <div className="choice-grid choice-grid--three">
          {PURIFIER_OPTIONS.map(([value, label]) => (
            <Choice
              key={value}
              name="purifier"
              value={value}
              selected={draft.home.purifier === value}
              onSelect={(next) => onUpdateHome("purifier", next)}
            >
              {label}
            </Choice>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
