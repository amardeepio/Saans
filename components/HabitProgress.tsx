"use client";

import { translate } from "@/lib/i18n";
import type { HabitSummary } from "@/lib/habits";
import { weekTotals } from "@/lib/habits";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

export function HabitRing({
  completed,
  total,
  percent,
}: {
  completed: number;
  total: number;
  percent: number;
}) {
  const { settings } = usePreferences();
  const circumference = 2 * Math.PI * 26;
  const dash = (percent / 100) * circumference;

  return (
    <div className="habit-ring" role="status" aria-live="polite">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="habit-ring-track" cx="32" cy="32" r="26" />
        <circle
          className="habit-ring-value"
          cx="32"
          cy="32"
          r="26"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div>
        <strong>
          {completed}/{total}
        </strong>
        <span>
          {translate(settings.locale, "playbook.progress")}
        </span>
      </div>
    </div>
  );
}

export function HabitCard({
  streak,
  week,
}: {
  streak: number;
  week: HabitSummary[];
}) {
  const { settings } = usePreferences();
  const totals = weekTotals(week);

  return (
    <div className="rail-card habit-card">
      <div className="rail-heading">
        <span className="eyebrow">{translate(settings.locale, "playbook.thisWeek")}</span>
        <Icon name="check" size={18} />
      </div>
      <div className="habit-streak">
        <strong>{streak}</strong>
        <span>{translate(settings.locale, "playbook.streak")}</span>
      </div>
      <div className="habit-week" aria-hidden="true">
        {week.map((day) => (
          <span
            key={day.key}
            className={`habit-day ${day.isToday ? "is-today" : ""}`}
            title={`${day.label}: ${day.completed}/${day.total}`}
          >
            <span style={{ height: `${Math.max(8, day.percent)}%` }} />
          </span>
        ))}
      </div>
      <p className="habit-week-total">
        {totals.completed}/{totals.total} · {totals.percent}%
        {totals.best ? ` · ${translate(settings.locale, "playbook.bestDay")}: ${totals.best.label}` : ""}
      </p>
      <p className="habit-note">{translate(settings.locale, "playbook.keepGoing")}</p>
    </div>
  );
}

export function DoneToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  const { settings } = usePreferences();
  return (
    <button
      type="button"
      className={`done-toggle ${checked ? "is-done" : ""}`}
      aria-pressed={checked}
      aria-label={
        checked
          ? translate(settings.locale, "playbook.markNotDone")
          : translate(settings.locale, "playbook.markDone")
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange();
      }}
    >
      {checked ? <Icon name="check" size={15} /> : null}
      <span className="sr-only">
        {checked
          ? translate(settings.locale, "playbook.markNotDone")
          : translate(settings.locale, "playbook.markDone")}
      </span>
    </button>
  );
}
