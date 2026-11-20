"use client";

import { translate } from "@/lib/i18n";
import type { AqiStandard } from "@/lib/types";
import { usePreferences } from "./PreferencesProvider";

export function AqiScaleToggle({ compact = false }: { compact?: boolean }) {
  const { settings, setAqiStandard } = usePreferences();
  const label = translate(settings.locale, "scale.label");

  return (
    <div
      className={`scale-toggle ${compact ? "scale-toggle--compact" : ""}`}
      role="radiogroup"
      aria-label={label}
    >
      {(
        [
          ["naqi", translate(settings.locale, "scale.naqi")],
          ["us", translate(settings.locale, "scale.us")],
        ] as Array<[AqiStandard, string]>
      ).map(([value, text]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={settings.aqiStandard === value}
          className={settings.aqiStandard === value ? "is-active" : ""}
          onClick={() => setAqiStandard(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
