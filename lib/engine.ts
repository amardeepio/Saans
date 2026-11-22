import {
  exposureWeight,
  maskGuidance,
  riskFor,
  riskSentence,
  RISK_LABELS,
  sensitiveGroups,
} from "./aqi";
import { describeAtmosphere } from "./dispersion";
import { buildHomeActions } from "./engine/actions-home";
import { buildRoutineActions } from "./engine/actions-routine";
import {
  combinedExposure,
  commuteFootprint,
  SLOT_ORDER,
  type AdviceContext,
} from "./engine/context";
import { pickSwaps } from "./engine/swaps";
import { buildWindows } from "./engine/windows";
import { measurementFor } from "./measurement";
import type {
  Advice,
  AirReading,
  AqiMeasurement,
  AqiStandard,
  PlanAction,
  Profile,
  RiskLevel,
} from "./types";

const HEADLINES: Record<RiskLevel, string> = {
  critical: "Make one room the safe harbour",
  severe: "Keep the day close to home",
  high: "Protect the morning, clean the indoors",
  elevated: "A watchful, well-ventilated day",
  low: "A good day to bank cleaner habits",
};

function buildAlertMessage(measurement: AqiMeasurement): string | null {
  if (measurement.standard === "naqi") {
    if (measurement.value > 400) {
      return "Severe air: avoid outdoor exercise, burning anything indoors and unnecessary trips. Keep medicines and a charged phone nearby.";
    }
    if (measurement.value > 300) {
      return "Very poor air: children, older adults and anyone with a heart or lung condition should stay indoors where possible.";
    }
    if (measurement.value > 200) {
      return "Poor air: cut prolonged outdoor exertion and keep windows facing the road closed during peaks.";
    }
    return null;
  }

  if (measurement.value > 300) {
    return "Hazardous air: avoid outdoor exercise, burning anything indoors and unnecessary trips. Keep medicines and a charged phone nearby.";
  }
  if (measurement.value > 200) {
    return "Very poor air: children, older adults and anyone with a heart or lung condition should stay indoors where possible.";
  }
  if (measurement.value > 150) {
    return "Unhealthy air: cut prolonged outdoor exertion and keep windows facing the road closed during peaks.";
  }
  return null;
}

function selectAndOrderActions(actions: PlanAction[]): {
  selected: PlanAction[];
  topAction: PlanAction;
} {
  const deduped = Array.from(new Map(actions.map((action) => [action.id, action])).values());
  const ranked = [...deduped].sort((a, b) => b.score - a.score);
  const topAction = ranked[0];
  const selected = ranked.slice(0, 9).sort((a, b) => {
    if (SLOT_ORDER[a.slot] !== SLOT_ORDER[b.slot]) {
      return SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot];
    }
    return b.score - a.score;
  });
  return { selected, topAction };
}

export function buildAdvice(
  profile: Profile,
  air: AirReading,
  standard: AqiStandard = "us",
): Advice {
  const measurement = measurementFor(standard, air);
  const risk = riskFor(air.aqi, profile.household);
  const sensitive = sensitiveGroups(profile.household);
  const hasSensitive = sensitive.length > 0;
  const windows = buildWindows(air, hasSensitive, standard);
  const atmosphere = describeAtmosphere(air.weather, air.hourly);
  const weight = exposureWeight(profile);
  const displayAqi = measurement.value;
  const mask = maskGuidance(air.aqi);

  const ctx: AdviceContext = {
    profile,
    measurement,
    atmosphere,
    windows,
    displayAqi,
    high: air.aqi > 150,
    severe: air.aqi > 200,
    commute: commuteFootprint(profile),
    mask,
    bestWindow: windows.best.label.toLowerCase(),
  };

  const allActions = [...buildRoutineActions(ctx), ...buildHomeActions(ctx)];
  const { selected, topAction } = selectAndOrderActions(allActions);

  const exposure = combinedExposure(selected);
  const co2e =
    Math.round(selected.reduce((sum, action) => sum + action.impact.co2eKgMonth, 0) * 10) / 10;
  const cost = selected.reduce((sum, action) => sum + action.impact.costInrMonth, 0);
  const sensitiveText = hasSensitive
    ? ` Your plan gives extra weight to ${sensitive.join(", ")}.`
    : " Your plan prioritises low-effort changes that most households can keep.";
  const commuteLabel =
    profile.mobility.primary === "car"
      ? "a car commute"
      : `a ${profile.mobility.primary.replace("-", " ")} commute`;

  return {
    risk,
    riskLabel: RISK_LABELS[risk],
    headline: HEADLINES[risk],
    summary: `${profile.city.name} is ${measurement.label.toLowerCase()} at ${measurement.scaleLabel} ${displayAqi}. ${riskSentence(risk, hasSensitive)}${sensitiveText} The plan below is weighted for ${commuteLabel} and a ${profile.budget} budget.`,
    alert: buildAlertMessage(measurement),
    measurement,
    grap: measurement.grap,
    atmosphere,
    actions: selected,
    topAction,
    windows,
    ledger: {
      exposurePct: exposure,
      co2eKgMonth: co2e,
      costInrMonth: cost,
      actionsCount: selected.length,
    },
    swaps: pickSwaps(profile, windows.best),
    contextNotes: [
      `Air quality: ${air.source === "open-meteo" ? "live Open-Meteo reading" : "sample winter pattern — live data was unavailable"}.`,
      `Displayed on the ${measurement.scaleLabel} scale${measurement.estimated ? " (estimated from current pollutant concentrations)" : ""}.`,
      "Exposure figures are modelled estimates for comparing actions, not medical measurements.",
      `Mask guidance at ${measurement.scaleLabel} ${displayAqi}: ${mask}`,
      `Dispersion: ${atmosphere.dispersionLabel.toLowerCase()} (${atmosphere.dispersionScore}/100), inversion risk ${atmosphere.inversionRisk}.`,
      `Vulnerability weighting: ${weight.toFixed(1)}× based on household composition.`,
    ],
  };
}

export function formatImpact(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)} ${unit}`;
}

export function actionImpactLine(action: PlanAction): string[] {
  const lines: string[] = [];
  if (action.impact.exposurePct > 0) {
    lines.push(`≈${action.impact.exposurePct}% less daily PM2.5 exposure`);
  }
  if (action.impact.co2eKgMonth > 0) {
    lines.push(`${action.impact.co2eKgMonth} kg CO₂e avoided / month`);
  }
  if (action.impact.costInrMonth > 0) {
    lines.push(`₹${action.impact.costInrMonth} saved / month`);
  } else if (action.impact.costInrMonth < 0) {
    lines.push(`≈₹${Math.abs(action.impact.costInrMonth)} cost / month`);
  }
  return lines;
}
