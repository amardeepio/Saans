import type { CSSProperties } from "react";
import {
  POLLUTANTS,
  pollutantDisplayValue,
  pollutantGuidelineText,
  type PollutantInfo,
} from "@/lib/pollutants";
import { pollutantSubIndex } from "@/lib/naqi";
import { askSaans } from "@/lib/ask";
import { translate } from "@/lib/i18n";
import type { AqiStandard, PollutantReadings } from "@/lib/types";
import { PollutantGlyph } from "./PollutantGlyph";
import { usePreferences } from "./PreferencesProvider";

function formattedValue(pollutant: PollutantInfo, readings: PollutantReadings): string {
  const value = pollutantDisplayValue(pollutant, readings);
  if (pollutant.key === "co") {
    return value.toFixed(2);
  }
  if (value >= 10) return Math.round(value).toLocaleString("en-IN");
  return value.toFixed(1);
}

export function PollutantGrid({
  readings,
  standard,
}: {
  readings: PollutantReadings;
  standard?: AqiStandard;
}) {
  const { settings } = usePreferences();
  const askLabel = translate(settings.locale, "assistant.ask");
  return (
    <div className="pollutant-grid">
      {POLLUTANTS.map((pollutant) => {
        const value = formattedValue(pollutant, readings);
        const guideline = pollutantGuidelineText(pollutant, readings);
        const subIndex =
          standard === "naqi" ? pollutantSubIndex(pollutant.key, readings[pollutant.key]) : null;
        return (
          <article
            key={pollutant.key}
            className="pollutant-card"
            style={{ "--pollutant-accent": pollutant.accent } as CSSProperties}
            aria-label={`${pollutant.label} ${pollutant.formula}: ${value} ${pollutant.unit}. ${guideline}.${subIndex !== null ? ` NAQI sub-index ${subIndex}.` : ""}`}
          >
            <div className="pollutant-card-top">
              <span className="pollutant-icon" aria-hidden="true">
                <PollutantGlyph kind={pollutant.icon} size={30} />
              </span>
              <div className="pollutant-identity">
                <span className="pollutant-formula">{pollutant.formula}</span>
                <h3>{pollutant.label}</h3>
              </div>
            </div>
            <div className="pollutant-value">
              <strong>{value}</strong>
              <span>{pollutant.unit}</span>
            </div>
            <p>{pollutant.note}</p>
            <span className="pollutant-guideline">
              {pollutant.guidelineLabel} · {guideline}
            </span>
            {subIndex !== null && (
              <span className="pollutant-subindex">NAQI sub-index {subIndex}</span>
            )}
            <button
              type="button"
              className="ask-saans pollutant-ask"
              onClick={() =>
                askSaans(
                  `${pollutant.label} (${pollutant.formula}) is ${value} ${pollutant.unit} right now. What does that mean for my household today, and what should I do about it?`,
                )
              }
            >
              {askLabel}
            </button>
          </article>
        );
      })}
    </div>
  );
}
