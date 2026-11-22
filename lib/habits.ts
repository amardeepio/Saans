export interface HabitDay {
  actionIds: string[];
  completed: string[];
  total: number;
}

export interface HabitState {
  version: 1;
  days: Record<string, HabitDay>;
}

export interface HabitSummary {
  key: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
  isToday: boolean;
}

export const HABITS_STORAGE_KEY = "saans.habits.v1";
export const HABITS_MAX_DAYS = 365;

export function emptyHabits(): HabitState {
  return { version: 1, days: {} };
}

/** Local-time date key, deliberately not UTC. */
export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
  date.setDate(date.getDate() + delta);
  return localDateKey(date);
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 80))
        .filter(Boolean),
    ),
  ).slice(0, max);
}

export function sanitiseHabits(value: unknown): HabitState {
  const input = object(value);
  const rawDays = object(input.days);
  const days: Record<string, HabitDay> = {};

  Object.entries(rawDays)
    .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .slice(-HABITS_MAX_DAYS)
    .forEach(([key, rawDay]) => {
      const day = object(rawDay);
      const actionIds = stringArray(day.actionIds);
      const completed = stringArray(day.completed);
      const total = Number(day.total);
      days[key] = {
        actionIds,
        completed: completed.filter((id) => actionIds.length === 0 || actionIds.includes(id)),
        total:
          Number.isFinite(total) && total > 0
            ? Math.min(50, Math.round(total))
            : Math.max(completed.length, actionIds.length),
      };
    });

  return { version: 1, days };
}

export function loadHabits(): HabitState {
  if (typeof window === "undefined") return emptyHabits();
  try {
    const raw = window.localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return emptyHabits();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || parsed.version !== 1) return emptyHabits();
    return sanitiseHabits(parsed);
  } catch {
    return emptyHabits();
  }
}

export function saveHabits(state: HabitState): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(state.days).sort();
    const trimmed = keys.length > HABITS_MAX_DAYS ? keys.slice(-HABITS_MAX_DAYS) : keys;
    const days: Record<string, HabitDay> = {};
    trimmed.forEach((key) => {
      days[key] = state.days[key];
    });
    window.localStorage.setItem(
      HABITS_STORAGE_KEY,
      JSON.stringify({ version: 1, days }),
    );
  } catch {
    // Storage can be unavailable in private mode; the session still works.
  }
}

export function toggleHabit(
  state: HabitState,
  dateKey: string,
  actionId: string,
  planActionIds: string[],
): HabitState {
  const current = state.days[dateKey] ?? {
    actionIds: planActionIds,
    completed: [],
    total: planActionIds.length,
  };
  const completed = current.completed.includes(actionId)
    ? current.completed.filter((id) => id !== actionId)
    : [...current.completed, actionId];

  return {
    ...state,
    days: {
      ...state.days,
      [dateKey]: {
        actionIds: planActionIds,
        completed,
        total: Math.max(planActionIds.length, current.total),
      },
    },
  };
}

export function completionFor(
  state: HabitState,
  dateKey: string,
  planActionIds: string[],
): { completed: string[]; total: number; percent: number } {
  const day = state.days[dateKey];
  const completed = (day?.completed ?? []).filter((id) => planActionIds.includes(id));
  const total = Math.max(planActionIds.length, day?.total ?? 0);
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed.length / total) * 100) : 0,
  };
}

/** A streak counts consecutive days with at least one completed action. */
export function habitStreak(state: HabitState, todayKey = localDateKey()): number {
  let streak = 0;
  let cursor = todayKey;
  // Allow the streak to survive a day that has not been opened yet.
  if ((state.days[cursor]?.completed.length ?? 0) === 0) {
    cursor = addDays(cursor, -1);
  }
  while ((state.days[cursor]?.completed.length ?? 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function weeklySummary(
  state: HabitState,
  endKey = localDateKey(),
  todayKey = endKey,
): HabitSummary[] {
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(endKey, index - 6);
    const day = state.days[key];
    const completed = day?.completed.length ?? 0;
    const total = day?.total ?? 0;
    const [year, month, date] = key.split("-").map(Number);
    const label = new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
    }).format(new Date(year, (month ?? 1) - 1, date ?? 1, 12));
    return {
      key,
      label,
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      isToday: key === todayKey,
    };
  });
}

export function weekTotals(summary: HabitSummary[]): {
  completed: number;
  total: number;
  percent: number;
  best: HabitSummary | null;
} {
  const completed = summary.reduce((sum, day) => sum + day.completed, 0);
  const total = summary.reduce((sum, day) => sum + day.total, 0);
  const best = summary.reduce<HabitSummary | null>(
    (current, day) =>
      day.total > 0 && (!current || day.percent > current.percent) ? day : current,
    null,
  );
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    best,
  };
}
