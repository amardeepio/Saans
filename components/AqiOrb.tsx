import { ringRange } from "@/lib/sample-air";
import { translate } from "@/lib/i18n";
import { measurementFor } from "@/lib/measurement";
import type { AirReading, Locale } from "@/lib/types";
import { formatNumber, formatObservedAt } from "@/lib/format";
import { usePreferences } from "./PreferencesProvider";

export function AqiOrb({
  air,
  locale,
  loading = false,
}: {
  air: AirReading | null;
  locale: Locale;
  loading?: boolean;
}) {
  const { settings } = usePreferences();
  if (!air || loading) {
    return (
      <div className="aqi-orb aqi-orb--loading" aria-busy="true">
        <div className="aqi-skeleton" />
        <p className="aqi-source">{translate(locale, "aqiOrb.reading")}</p>
      </div>
    );
  }

  const measurement = measurementFor(settings.aqiStandard, air);
  const range = ringRange(measurement.value);
  const circumference = 2 * Math.PI * 92;
  const dash = (range.percent / 100) * circumference;
  const source = translate(
    locale,
    air.source === "open-meteo" ? "source.live" : "cityReport.sampleSource",
  );

  return (
    <div
      className={`aqi-orb tone-${measurement.tone}`}
      role="group"
      aria-label={translate(locale, "aqiOrb.label", {
        scale: measurement.scaleLabel,
        value: measurement.value,
        label: measurement.label,
        advice: measurement.advice,
        source,
      })}
    >
      <svg className="aqi-ring" viewBox="0 0 220 220" aria-hidden="true">
        <circle className="aqi-ring-track" cx="110" cy="110" r="92" />
        <circle
          className="aqi-ring-value"
          cx="110"
          cy="110"
          r="92"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <circle className="aqi-ring-tick" cx="110" cy="18" r="2.2" />
      </svg>
      <div className="aqi-orb-inner">
        <span className="aqi-orb-kicker">{measurement.scaleLabel}</span>
        <strong className="aqi-orb-number">{formatNumber(measurement.value)}</strong>
        <span className="aqi-orb-category">{measurement.label}</span>
        {measurement.estimated && (
          <span className="aqi-orb-estimate">{translate(locale, "aqiOrb.estimated")}</span>
        )}
      </div>
      <div className="aqi-orb-meta">
        <span className={`source-dot ${air.source === "open-meteo" ? "is-live" : ""}`} aria-hidden="true" />
        <span>{source}</span>
        <span className="meta-separator" aria-hidden="true">·</span>
        <span>{formatObservedAt(air.observedAt)}</span>
      </div>
    </div>
  );
}
