"use client";

import type { ReactNode } from "react";
import { Icon } from "../Icon";

export function Stepper({
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

export function Choice<T extends string>({
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
  children: ReactNode;
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

export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
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
