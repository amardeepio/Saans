"use client";

import { formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { INDIA_TRACKED_CITIES } from "@/lib/india";
import { measurementFor } from "@/lib/measurement";
import type { AqiStandard, CityDetail, Locale } from "@/lib/types";
import { WeatherGlyph } from "../WeatherGlyph";

interface CityRankingListProps {
  ranking: CityDetail[] | null;
  selectedId: string | undefined;
  standard: AqiStandard;
  liveCount: number;
  sourceLabel: string;
  locale: Locale;
  onSelect: (item: CityDetail) => void;
}

export function CityRankingList({
  ranking,
  selectedId,
  standard,
  liveCount,
  sourceLabel,
  locale,
  onSelect,
}: CityRankingListProps) {
  const topCities = ranking?.slice(0, 12) ?? [];
  const maxAqi = Math.max(1, ...topCities.map((item) => item.aqi));

  return (
    <section id="city-ranking" className="dashboard-ranking-panel" aria-labelledby="ranking-title">
      <div className="dashboard-panel-head">
        <div>
          <span className="eyebrow">{translate(locale, "dashboard.rankingEyebrow")}</span>
          <h2 id="ranking-title">{translate(locale, "dashboard.rankingTitle")}</h2>
        </div>
        <span className="dashboard-source-pill">
          <span className={`source-dot ${liveCount > 0 ? "is-live" : ""}`} aria-hidden="true" />
          {sourceLabel}
        </span>
      </div>
      <p className="dashboard-panel-lede">
        {translate(locale, "dashboard.rankingLede", { count: INDIA_TRACKED_CITIES.length })}
      </p>

      {ranking ? (
        <ol className="ranking-list" aria-label={translate(locale, "dashboard.rankingList")}>
          {topCities.map((item, index) => {
            const itemMeasurement = measurementFor(standard, item);
            const isSelected = selectedId === item.city.id;
            return (
              <li key={item.city.id}>
                <button
                  type="button"
                  className={`ranking-row ${isSelected ? "is-selected" : ""}`}
                  onClick={() => onSelect(item)}
                  aria-pressed={isSelected}
                >
                  <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="ranking-city">
                    <strong>{item.city.name}</strong>
                    <small>{item.city.region ?? "India"}</small>
                  </span>
                  <span className={`ranking-weather tone-${itemMeasurement.tone}`}>
                    <WeatherGlyph code={item.weather.code} size={14} />
                    {Math.round(item.weather.temperatureC)}°C
                  </span>
                  <span className={`ranking-aqi tone-${itemMeasurement.tone}`}>
                    {formatNumber(itemMeasurement.value)}
                    <small>{itemMeasurement.shortLabel}</small>
                  </span>
                  <span className="ranking-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(8, (item.aqi / maxAqi) * 100)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div
          className="ranking-loading"
          aria-busy="true"
          aria-label={translate(locale, "dashboard.rankingLoading")}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      )}
    </section>
  );
}
