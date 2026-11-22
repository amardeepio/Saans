import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  completionFor,
  emptyHabits,
  HABITS_STORAGE_KEY,
  habitStreak,
  loadHabits,
  localDateKey,
  sanitizeHabits,
  saveHabits,
  toggleHabit,
  weekTotals,
  weeklySummary,
} from "@/lib/habits";

afterEach(() => {
  vi.unstubAllGlobals();
});

const TODAY = localDateKey(new Date(2026, 10, 20, 12));
const ACTIONS = ["a", "b", "c"];

describe("habit tracking", () => {
  it("uses local date keys and adds days across month boundaries", () => {
    expect(TODAY).toBe("2026-11-20");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("toggles actions and calculates completion", () => {
    let state = emptyHabits();
    state = toggleHabit(state, TODAY, "a", ACTIONS);
    state = toggleHabit(state, TODAY, "c", ACTIONS);
    const completion = completionFor(state, TODAY, ACTIONS);
    expect(completion.completed).toEqual(["a", "c"]);
    expect(completion.total).toBe(3);
    expect(completion.percent).toBe(67);

    state = toggleHabit(state, TODAY, "a", ACTIONS);
    expect(completionFor(state, TODAY, ACTIONS).completed).toEqual(["c"]);
  });

  it("counts a streak and tolerates an unopened current day", () => {
    let state = emptyHabits();
    state = toggleHabit(state, addDays(TODAY, -1), "a", ACTIONS);
    state = toggleHabit(state, addDays(TODAY, -2), "a", ACTIONS);
    expect(habitStreak(state, TODAY)).toBe(2);
    state = toggleHabit(state, TODAY, "a", ACTIONS);
    expect(habitStreak(state, TODAY)).toBe(3);
  });

  it("summarises the last seven days", () => {
    let state = emptyHabits();
    state = toggleHabit(state, TODAY, "a", ACTIONS);
    state = toggleHabit(state, addDays(TODAY, -1), "a", ACTIONS);
    const week = weeklySummary(state, TODAY);
    expect(week).toHaveLength(7);
    expect(week[6].isToday).toBe(true);
    expect(weekTotals(week).completed).toBe(2);
    expect(weekTotals(week).best).not.toBeNull();
  });

  it("sanitizes malformed stored data", () => {
    const state = sanitizeHabits({
      version: 1,
      days: {
        "2026-11-20": { actionIds: ["a", "a", 3], completed: ["a", "x"], total: 4 },
        bad: { actionIds: [] },
      },
    });
    expect(Object.keys(state.days)).toEqual(["2026-11-20"]);
    expect(state.days["2026-11-20"].completed).toEqual(["a"]);
  });

  it("loads and saves habits through versioned storage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });

    expect(loadHabits()).toEqual(emptyHabits());
    let state = emptyHabits();
    state = toggleHabit(state, TODAY, "a", ACTIONS);
    saveHabits(state);
    expect(loadHabits().days[TODAY].completed).toEqual(["a"]);

    store.set(HABITS_STORAGE_KEY, "{bad json");
    expect(loadHabits()).toEqual(emptyHabits());
  });
});
