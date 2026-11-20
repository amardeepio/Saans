"use client";

import { translate } from "@/lib/i18n";
import type { GrapInfo } from "@/lib/types";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

export function GrapNotice({ grap }: { grap: GrapInfo | null }) {
  const { settings } = usePreferences();
  if (!grap) return null;

  return (
    <div className={`rail-card grap-card grap-stage-${grap.stage}`}>
      <div className="rail-heading">
        <span className="eyebrow">{translate(settings.locale, "grap.title")}</span>
        <Icon name="info" size={18} />
      </div>
      <h3>{grap.label}</h3>
      <p className="grap-range">{grap.range}</p>
      <p>{grap.summary}</p>
      <ul className="grap-actions">
        {grap.actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
      <p className="grap-disclaimer">{translate(settings.locale, "grap.disclaimer")}</p>
    </div>
  );
}
