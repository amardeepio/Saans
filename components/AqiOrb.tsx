import { aqiCategory } from "@/lib/aqi";
import { ringRange } from "@/lib/sample-air";
import type { AirReading } from "@/lib/types";
import { formatNumber, formatObservedAt } from "@/lib/format";

export function AqiOrb({ air, loading = false }: { air: AirReading | null; loading?: boolean }) {
  if (!air || loading) {
    return (
      <div className="aqi-orb aqi-orb--loading" aria-busy="true">
        <div className="aqi-skeleton" />
        <p className="aqi-source">Reading the sky…</p>
      </div>
    );
  }

  const category = aqiCategory(air.aqi);
  const range = ringRange(air.aqi);
  const circumference = 2 * Math.PI * 92;
  const dash = (range.percent / 100) * circumference;
  const source = air.source === "open-meteo" ? "Live · Open-Meteo" : "Sample · live data unavailable";

  return (
    <div
      className={`aqi-orb tone-${category.tone}`}
      role="group"
      aria-label={`Air quality index ${air.aqi}, ${category.label}. ${category.advice} Source: ${source}.`}
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
        <span className="aqi-orb-kicker">US AQI</span>
        <strong className="aqi-orb-number">{formatNumber(air.aqi)}</strong>
        <span className="aqi-orb-category">{category.label}</span>
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
