"use client";

import type { RefObject } from "react";
import { formatNumber, formatObservedAt } from "@/lib/format";
import { measurementFor } from "@/lib/measurement";
import type { AqiStandard, CityDetail } from "@/lib/types";
import { GrapNotice } from "../GrapNotice";
import { Icon } from "../Icon";
import { PollutantGrid } from "../PollutantGrid";
import { ShareRow } from "../ShareRow";
import { WeatherGlyph } from "../WeatherGlyph";

interface CityDetailPanelProps {
  detailRef: RefObject<HTMLDivElement | null>;
  selected: CityDetail | null;
  standard: AqiStandard;
}

export function CityDetailPanel({ detailRef, selected, standard }: CityDetailPanelProps) {
  const measurement = selected ? measurementFor(standard, selected) : null;

  return (
    <section
      ref={detailRef}
      id="city-detail-panel"
      className="dashboard-detail-panel"
      aria-labelledby="selected-city-title"
    >
      <p className="sr-only" aria-live="polite">
        {selected ? `Showing air quality and pollutants for ${selected.city.name}.` : ""}
      </p>
      {selected && measurement ? (
        <>
          <div className="dashboard-panel-head">
            <div>
              <span className="eyebrow">Pollutant watch</span>
              <h2 id="selected-city-title">{selected.city.name}</h2>
            </div>
            <span className="dashboard-detail-source">
              <span
                className={`source-dot ${selected.source === "open-meteo" ? "is-live" : ""}`}
                aria-hidden="true"
              />
              {selected.source === "open-meteo" ? "Live" : "Sample"}
            </span>
          </div>

          <ShareRow
            className="dashboard-share"
            title={`${selected.city.name}${selected.city.region ? `, ${selected.city.region}` : ""}`}
            value={measurement.value}
            scaleLabel={measurement.scaleLabel}
            label={measurement.label}
            path={`/dashboard?city=${selected.city.id}`}
          />

          <div className={`dashboard-selected-head tone-${measurement.tone}`}>
            <div className="dashboard-selected-aqi">
              <strong>{formatNumber(measurement.value)}</strong>
              <span>
                {measurement.scaleLabel} · {measurement.label}
              </span>
            </div>
            <div className="dashboard-selected-weather">
              <WeatherGlyph code={selected.weather.code} size={22} />
              <div>
                <strong>{Math.round(selected.weather.temperatureC)}°C</strong>
                <span>
                  {selected.weather.label} · feels {Math.round(selected.weather.apparentTemperatureC)}
                  °
                </span>
                <small>
                  {selected.weather.humidity}% humidity · {selected.weather.windKph} km/h
                </small>
              </div>
            </div>
          </div>

          <p className="dashboard-selected-advice">
            {measurement.advice} Last reading {formatObservedAt(selected.observedAt)}.
          </p>

          <GrapNotice grap={measurement.grap} />
          <PollutantGrid readings={selected} standard={standard} />
          <p className="dashboard-detail-note">
            Pollutant cards show ambient concentrations, not personal exposure. WHO comparisons are
            context, not a diagnosis.
          </p>
        </>
      ) : (
        <div className="dashboard-detail-empty">
          <span>
            <Icon name="wind" size={26} />
          </span>
          <h2 id="selected-city-title">Choose a city.</h2>
          <p>Select a city from the ranking or search to see its pollutant mix.</p>
        </div>
      )}
    </section>
  );
}
