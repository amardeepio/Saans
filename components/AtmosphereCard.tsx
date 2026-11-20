"use client";

import { translate } from "@/lib/i18n";
import type { Atmosphere } from "@/lib/types";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

export function AtmosphereCard({ atmosphere }: { atmosphere: Atmosphere }) {
  const { settings } = usePreferences();
  const scoreLabel =
    atmosphere.dispersionLabel === "Good"
      ? translate(settings.locale, "atmosphere.good")
      : atmosphere.dispersionLabel === "Poor"
        ? translate(settings.locale, "atmosphere.poor")
        : translate(settings.locale, "atmosphere.moderate");

  return (
    <div className={`rail-card atmosphere-card atmosphere-${atmosphere.dispersionLabel.toLowerCase()}`}>
      <div className="rail-heading">
        <span className="eyebrow">{translate(settings.locale, "atmosphere.title")}</span>
        <Icon name="wind" size={18} />
      </div>
      <div className="atmosphere-score">
        <strong>{atmosphere.dispersionScore}</strong>
        <div>
          <span>{translate(settings.locale, "atmosphere.score")}</span>
          <small>{scoreLabel}</small>
        </div>
      </div>
      <div className="atmosphere-meter" aria-hidden="true">
        <span style={{ width: `${atmosphere.dispersionScore}%` }} />
      </div>
      <dl className="atmosphere-list">
        <div>
          <dt>{translate(settings.locale, "atmosphere.inversion")}</dt>
          <dd>
            {atmosphere.inversionRisk === "high"
              ? translate(settings.locale, "atmosphere.high")
              : atmosphere.inversionRisk === "low"
                ? translate(settings.locale, "atmosphere.low")
                : translate(settings.locale, "atmosphere.moderate")}
          </dd>
        </div>
        <div>
          <dt>{translate(settings.locale, "atmosphere.bestWindow")}</dt>
          <dd>
            {atmosphere.bestVentilationWindow?.label ??
              translate(settings.locale, "atmosphere.none")}
          </dd>
        </div>
      </dl>
      <p className="atmosphere-note">{atmosphere.note}</p>
      <p className="atmosphere-advice">{atmosphere.ventilationAdvice}</p>
    </div>
  );
}
