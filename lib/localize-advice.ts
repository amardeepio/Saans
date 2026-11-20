import type { Advice } from "./types";

/**
 * The generated plan is long-form prose. These helpers let the optional
 * translation route translate it as a flat list of strings and merge the
 * result back without losing IDs, numbers or scores.
 */
export function collectAdviceStrings(advice: Advice): string[] {
  const strings: string[] = [];
  const push = (value: string | null | undefined) => {
    if (typeof value === "string") strings.push(value);
  };

  push(advice.riskLabel);
  push(advice.headline);
  push(advice.summary);
  push(advice.alert);
  push(advice.measurement.scaleLabel);
  push(advice.measurement.label);
  push(advice.measurement.shortLabel);
  push(advice.measurement.advice);
  push(advice.grap?.label);
  push(advice.grap?.range);
  push(advice.grap?.summary);
  advice.grap?.actions.forEach(push);
  push(advice.atmosphere.note);
  push(advice.atmosphere.ventilationAdvice);
  push(advice.windows.best.detail);
  push(advice.windows.worst.detail);

  advice.actions.forEach((action) => {
    push(action.title);
    push(action.summary);
    action.steps.forEach(push);
    push(action.why);
    push(action.categoryLabel);
    push(action.timeLabel);
    action.tags.forEach(push);
  });

  advice.swaps.forEach((swap) => {
    push(swap.title);
    push(swap.description);
    push(swap.impact);
    push(swap.cost);
  });

  advice.contextNotes.forEach(push);
  return strings;
}

export function applyAdviceTranslations(advice: Advice, translations: string[]): Advice {
  let index = 0;
  const next = () => translations[index++] ?? "";
  const optional = (value: string | null) => (value === null ? null : next());

  const riskLabel = next();
  const headline = next();
  const summary = next();
  const alert = optional(advice.alert);
  const scaleLabel = next();
  const measurementLabel = next();
  const measurementShortLabel = next();
  const measurementAdvice = next();

  const grap = advice.grap
    ? {
        ...advice.grap,
        label: next(),
        range: next(),
        summary: next(),
        actions: advice.grap.actions.map(() => next()),
      }
    : null;

  const atmosphere = {
    ...advice.atmosphere,
    note: next(),
    ventilationAdvice: next(),
  };

  const windows = {
    best: { ...advice.windows.best, detail: next() },
    worst: { ...advice.windows.worst, detail: next() },
  };

  const actions = advice.actions.map((action) => ({
    ...action,
    title: next(),
    summary: next(),
    steps: action.steps.map(() => next()),
    why: next(),
    categoryLabel: next(),
    timeLabel: next(),
    tags: action.tags.map(() => next()),
  }));

  const swaps = advice.swaps.map((swap) => ({
    ...swap,
    title: next(),
    description: next(),
    impact: next(),
    cost: next(),
  }));

  const contextNotes = advice.contextNotes.map(() => next());

  return {
    ...advice,
    riskLabel,
    headline,
    summary,
    alert,
    measurement: {
      ...advice.measurement,
      scaleLabel,
      label: measurementLabel,
      shortLabel: measurementShortLabel,
      advice: measurementAdvice,
    },
    grap,
    atmosphere,
    windows,
    actions,
    swaps,
    contextNotes,
    topAction: actions.find((action) => action.id === advice.topAction.id) ?? actions[0],
  };
}
