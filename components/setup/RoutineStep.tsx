"use client";

import type { RefObject } from "react";
import type { Budget, Priority, Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Choice, Toggle } from "./FormControls";

interface RoutineStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  draft: Profile;
  onUpdateMobility: <Key extends keyof Profile["mobility"]>(
    key: Key,
    value: Profile["mobility"][Key],
  ) => void;
  onUpdateBudget: (budget: Budget) => void;
  onTogglePriority: (priority: Priority) => void;
}

const MOBILITY_OPTIONS = [
  ["walk", "Walk"],
  ["cycle", "Cycle"],
  ["two-wheeler", "Two-wheeler"],
  ["car", "Car"],
  ["bus", "Bus"],
  ["metro", "Metro"],
] as const;

const BUDGET_OPTIONS: Array<{ value: Budget; label: string }> = [
  { value: "lean", label: "Keep it free" },
  { value: "balanced", label: "A little to spend" },
  { value: "comfortable", label: "Invest for comfort" },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "health", label: "Protect health" },
  { value: "planet", label: "Cut emissions" },
  { value: "cost", label: "Save money" },
  { value: "comfort", label: "Keep it simple" },
];

export function RoutineStep({
  headingRef,
  draft,
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
        How does your week move?
      </h2>
      <p className="setup-lede">
        Commutes are where many households meet their highest pollution. Saans uses this to suggest
        a cleaner route, not a guilt trip.
      </p>

      <fieldset className="field-block">
        <legend className="field-label">Usual way to get around</legend>
        <div className="choice-grid choice-grid--three">
          {MOBILITY_OPTIONS.map(([value, label]) => (
            <Choice
              key={value}
              name="mobility"
              value={value}
              selected={draft.mobility.primary === value}
              onSelect={(next) => onUpdateMobility("primary", next)}
            >
              {label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <div className="field-block slider-block">
        <label className="field-label" htmlFor="commute-minutes">
          One-way commute{" "}
          <output htmlFor="commute-minutes">{draft.mobility.commuteMinutes} min</output>
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
          <span>At home</span>
          <span>2 hours</span>
        </div>
      </div>

      <div className="toggle-row toggle-row--stack">
        <Toggle
          checked={draft.mobility.schoolRun}
          onChange={(value) => onUpdateMobility("schoolRun", value)}
        >
          I do a school run
        </Toggle>
        <Toggle
          checked={draft.mobility.workFromHomeDays > 1}
          onChange={(value) => onUpdateMobility("workFromHomeDays", value ? 2 : 0)}
        >
          I can work from home on smog days
        </Toggle>
      </div>

      <fieldset className="field-block">
        <legend className="field-label">Budget for changes</legend>
        <div className="choice-grid choice-grid--three">
          {BUDGET_OPTIONS.map(({ value, label }) => (
            <Choice
              key={value}
              name="budget"
              value={value}
              selected={draft.budget === value}
              onSelect={onUpdateBudget}
            >
              {label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-block">
        <legend className="field-label">What should Saans optimise for?</legend>
        <div className="toggle-row">
          {PRIORITY_OPTIONS.map((option) => (
            <Toggle
              key={option.value}
              checked={draft.priorities.includes(option.value)}
              onChange={() => onTogglePriority(option.value)}
            >
              {option.label}
            </Toggle>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
