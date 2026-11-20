"use client";

import { aqiCategory } from "@/lib/aqi";
import { formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { displayAqiFor } from "@/lib/measurement";
import { naqiCategory } from "@/lib/naqi";
import { hourLabelFromIso } from "@/lib/sample-air";
import type { AqiStandard, HourlyAir } from "@/lib/types";
import { usePreferences } from "./PreferencesProvider";

const WIDTH = 1000;
const HEIGHT = 250;
const PAD = { left: 46, right: 18, top: 22, bottom: 46 };

function toneFor(standard: AqiStandard, value: number): string {
  return standard === "naqi" ? naqiCategory(value).tone : aqiCategory(value).tone;
}

export function AirCurve({
  hourly,
  standard,
  bestLabel,
  worstLabel,
}: {
  hourly: HourlyAir[];
  standard: AqiStandard;
  bestLabel?: string;
  worstLabel?: string;
}) {
  const { settings } = usePreferences();
  if (hourly.length === 0) return null;

  const points = hourly.slice(0, 24).map((point) => ({
    ...point,
    value: displayAqiFor(standard, point),
  }));
  const maxValue = Math.max(120, ...points.map((point) => point.value));
  const yMax = Math.min(500, Math.ceil(maxValue / 50) * 50);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const barWidth = Math.max(6, Math.min(26, plotWidth / points.length - 3));

  const x = (index: number) => PAD.left + index * step;
  const y = (value: number) => PAD.top + plotHeight - (Math.min(yMax, value) / yMax) * plotHeight;

  const bestIndex = points.reduce(
    (current, point, index) => (point.value < points[current].value ? index : current),
    0,
  );
  const worstIndex = points.reduce(
    (current, point, index) => (point.value > points[current].value ? index : current),
    0,
  );

  const thresholds = standard === "naqi" ? [50, 100, 200, 300, 400] : [50, 100, 150, 200, 300];

  const windPoints = points
    .map((point, index) => `${x(index)},${PAD.top + plotHeight - Math.min(1, (point.windKph ?? 0) / 30) * plotHeight * 0.35}`)
    .join(" ");

  const summary = points
    .map((point) => `${hourLabelFromIso(point.time)} ${point.value}`)
    .join(", ");

  return (
    <figure className="air-curve">
      <figcaption>
        <span className="eyebrow">{translate(settings.locale, "curve.title")}</span>
        <p>{translate(settings.locale, "curve.intro")}</p>
      </figcaption>

      <div className="air-curve-legend" aria-hidden="true">
        <span>
          <span className="legend-swatch legend-swatch--aqi" /> {translate(settings.locale, "curve.aqi")}
        </span>
        <span>
          <span className="legend-swatch legend-swatch--wind" /> {translate(settings.locale, "curve.wind")}
        </span>
        <span>
          <span className="legend-swatch legend-swatch--best" /> {translate(settings.locale, "curve.best")}
          {bestLabel ? ` · ${bestLabel}` : ""}
        </span>
        <span>
          <span className="legend-swatch legend-swatch--worst" /> {translate(settings.locale, "curve.worst")}
          {worstLabel ? ` · ${worstLabel}` : ""}
        </span>
      </div>

      <div className="air-curve-scroll">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${translate(settings.locale, "curve.title")}. ${summary}`}
        >
          <rect
            className="curve-best-band"
            x={Math.max(PAD.left, x(bestIndex) - barWidth)}
            y={PAD.top}
            width={barWidth * 2 + 4}
            height={plotHeight}
            rx={8}
          />
          <rect
            className="curve-worst-band"
            x={Math.max(PAD.left, x(worstIndex) - barWidth)}
            y={PAD.top}
            width={barWidth * 2 + 4}
            height={plotHeight}
            rx={8}
          />

          {thresholds
            .filter((threshold) => threshold <= yMax)
            .map((threshold) => (
              <g key={threshold}>
                <line
                  className="curve-threshold"
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y(threshold)}
                  y2={y(threshold)}
                />
                <text className="curve-threshold-label" x={8} y={y(threshold) + 4}>
                  {threshold}
                </text>
              </g>
            ))}

          {points.map((point, index) => {
            const barHeight = Math.max(2, PAD.top + plotHeight - y(point.value));
            const stagnant =
              (point.windKph !== undefined && point.windKph < 5) ||
              (point.boundaryLayerM !== undefined && point.boundaryLayerM < 200);
            return (
              <g key={point.time} className={stagnant ? "curve-bar is-stagnant" : "curve-bar"}>
                <rect
                  className={`curve-bar-fill tone-${toneFor(standard, point.value)}`}
                  x={x(index) - barWidth / 2}
                  y={y(point.value)}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                />
                {index === 0 && (
                  <circle className="curve-now-dot" cx={x(index)} cy={y(point.value) - 8} r={4} />
                )}
                {index % 3 === 0 && (
                  <text
                    className="curve-hour-label"
                    x={x(index)}
                    y={HEIGHT - 24}
                    textAnchor="middle"
                  >
                    {hourLabelFromIso(point.time)}
                  </text>
                )}
                <text
                  className="curve-value-label"
                  x={x(index)}
                  y={y(point.value) - 6}
                  textAnchor="middle"
                >
                  {index % 3 === 0 || index === bestIndex || index === worstIndex
                    ? formatNumber(point.value)
                    : ""}
                </text>
              </g>
            );
          })}

          {points.some((point) => typeof point.windKph === "number") && (
            <polyline className="curve-wind-line" points={windPoints} />
          )}

          <line
            className="curve-baseline"
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
          />
        </svg>
      </div>

      <details className="air-curve-table">
        <summary>{translate(settings.locale, "curve.table")}</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">{translate(settings.locale, "curve.table")}</caption>
            <thead>
              <tr>
                <th scope="col">{translate(settings.locale, "curve.time")}</th>
                <th scope="col">{translate(settings.locale, "curve.aqi")}</th>
                <th scope="col">{translate(settings.locale, "curve.wind")}</th>
                <th scope="col">{translate(settings.locale, "curve.rain")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.time}>
                  <td>{hourLabelFromIso(point.time)}</td>
                  <td>{formatNumber(point.value)}</td>
                  <td>{point.windKph !== undefined ? `${Math.round(point.windKph)} km/h` : "—"}</td>
                  <td>{point.precipMm !== undefined ? `${point.precipMm} mm` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
