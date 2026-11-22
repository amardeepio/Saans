"use client";

import type { RefObject } from "react";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { Budget, Locale, Priority, Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Choice, Toggle } from "./FormControls";

interface RoutineStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  draft: Profile;
  locale: Locale;
  onUpdateMobility: <Key extends keyof Profile["mobility"]>(
    key: Key,
    value: Profile["mobility"][Key],
  ) => void;
  onUpdateBudget: (budget: Budget) => void;
  onTogglePriority: (priority: Priority) => void;
}

const MOBILITY_OPTIONS = [
  ["walk", "setup.walk"],
  ["cycle", "setup.cycle"],
  ["two-wheeler", "setup.twoWheeler"],
  ["car", "setup.car"],
  ["bus", "setup.bus"],
  ["metro", "setup.metro"],
] as const satisfies ReadonlyArray<readonly [Profile["mobility"]["primary"], TranslationKey]>;

const BUDGET_OPTIONS: ReadonlyArray<readonly [Budget, TranslationKey]> = [
  ["lean", "setup.lean"],
  ["balanced", "setup.balanced"],
  ["comfortable", "setup.comfortable"],
];

const PRIORITY_OPTIONS: ReadonlyArray<readonly [Priority, TranslationKey]> = [
  ["health", "setup.health"],
  ["planet", "setup.planet"],
  ["cost", "setup.costPriority"],
  ["comfort", "setup.comfort"],
];

export function RoutineStep({
  headingRef,
  draft,
  locale,
  onUpdateMobility,
  onUpdateBudget,
  onTogglePriority,
}: RoutineStepProps) {
  return (
    <section aria-labelledby="setup-title">
      <span className="setup-illustration" aria-hidden="true">
        <Icon name="mobility" size={25} />
      </span>
      <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
        {translate(locale, "setup.weekTitle")}
      </h2>
      <p className="setup-lede">{translate(locale, "setup.weekLede")}</p>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.mobility")}</legend>
        <div className="choice-grid choice-grid--three">
          {MOBILITY_OPTIONS.map(([value, key]) => (
            <Choice
              key={value}
              name="mobility"
              value={value}
              selected={draft.mobility.primary === value}
              onSelect={(next) => onUpdateMobility("primary", next)}
            >
              {translate(locale, key)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <div className="field-block slider-block">
        <label className="field-label" htmlFor="commute-minutes">
          {translate(locale, "setup.commute")}{" "}
          <output htmlFor="commute-minutes">
            {translate(locale, "setup.minutes", { value: draft.mobility.commuteMinutes })}
          </output>
        </label>
        <input
          id="commute-minutes"
          type="range"
          min={0}
          max={120}
          step={5}
          value={draft.mobility.commuteMinutes}
          onChange={(event) => onUpdateMobility("commuteMinutes", Number(event.target.value))}
        />
        <div className="range-labels" aria-hidden="true">
          <span>{translate(locale, "setup.atHome")}</span>
          <span>{translate(locale, "setup.twoHours")}</span>
        </div>
      </div>

      <div className="toggle-row toggle-row--stack">
        <Toggle
          checked={draft.mobility.schoolRun}
          onChange={(value) => onUpdateMobility("schoolRun", value)}
        >
          {translate(locale, "setup.schoolRun")}
        </Toggle>
        <Toggle
          checked={draft.mobility.workFromHomeDays > 1}
          onChange={(value) => onUpdateMobility("workFromHomeDays", value ? 2 : 0)}
        >
          {translate(locale, "setup.workFromHome")}
        </Toggle>
      </div>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.budget")}</legend>
        <div className="choice-grid choice-grid--three">
          {BUDGET_OPTIONS.map(([value, key]) => (
            <Choice
              key={value}
              name="budget"
              value={value}
              selected={draft.budget === value}
              onSelect={onUpdateBudget}
            >
              {translate(locale, key)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">{translate(locale, "setup.optimize")}</legend>
        <div className="toggle-row">
          {PRIORITY_OPTIONS.map(([value, key]) => (
            <Toggle
              key={value}
              checked={draft.priorities.includes(value)}
              onChange={() => onTogglePriority(value)}
            >
              {translate(locale, key)}
            </Toggle>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
