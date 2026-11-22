"use client";

import { useEffect, useRef } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { formatNumber, formatObservedAt } from "@/lib/format";
import { measurementFor } from "@/lib/measurement";
import type { City, CityDetail } from "@/lib/types";
import { Icon } from "./Icon";
import { PollutantGrid } from "./PollutantGrid";
import { usePreferences } from "./PreferencesProvider";
import { WeatherGlyph } from "./WeatherGlyph";

interface CityDetailDialogProps {
  detail: CityDetail;
  onClose: () => void;
  onUseCity?: (city: City) => void;
}

export function CityDetailDialog({ detail, onClose, onUseCity }: CityDetailDialogProps) {
  const { settings } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const measurement = measurementFor(settings.aqiStandard, detail);
  const sourceLabel =
    detail.source === "open-meteo" ? "Live · Open-Meteo" : "Sample · live data unavailable";

  useDialogFocus(true, dialogRef);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.classList.add("city-dialog-open");
    const timer = window.setTimeout(() => closeRef.current?.focus(), 90);

    return () => {
      window.clearTimeout(timer);
      if (dialog?.open) dialog.close();
      document.body.classList.remove("city-dialog-open");
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="city-detail-dialog"
      aria-labelledby="city-detail-title"
      aria-describedby="city-detail-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="city-detail-shell" onClick={(event) => event.stopPropagation()}>
        <header className="city-detail-hero">
          <div className="city-detail-top">
            <span className="eyebrow eyebrow--light">City air report</span>
            <button
              ref={closeRef}
              type="button"
              className="city-detail-close"
              onClick={onClose}
              aria-label="Close city air report"
            >
              <Icon name="close" size={19} />
            </button>
          </div>

          <div className="city-detail-heading">
            <div>
              <h2 id="city-detail-title">{detail.city.name}</h2>
              <p>
                {[detail.city.region, detail.city.country].filter(Boolean).join(", ")} ·{" "}
                {formatObservedAt(detail.observedAt)}
              </p>
            </div>
            <div className={`city-detail-aqi tone-${measurement.tone}`}>
              <strong>{formatNumber(measurement.value)}</strong>
              <span>{measurement.scaleLabel}</span>
            </div>
          </div>

          <div className="city-detail-weather" aria-label="Current weather">
            <span className="city-detail-weather-icon">
              <WeatherGlyph code={detail.weather.code} size={21} />
            </span>
            <strong>{Math.round(detail.weather.temperatureC)}°C</strong>
            <span>{detail.weather.label}</span>
            <span className="city-detail-weather-extra">
              Feels {Math.round(detail.weather.apparentTemperatureC)}°
            </span>
            <span className="city-detail-weather-extra">
              {detail.weather.humidity}% humidity
            </span>
            <span className="city-detail-weather-extra">{detail.weather.windKph} km/h wind</span>
          </div>

          <p id="city-detail-description" className="city-detail-category">
            <strong>{measurement.label}.</strong> {measurement.advice}
          </p>
        </header>

        <div className="city-detail-body">
          <div className="city-detail-section-head">
            <div>
              <span className="eyebrow">Major pollutants</span>
              <h3>What is in the air right now</h3>
            </div>
            <span className="city-detail-unit-note">WHO comparisons</span>
          </div>

          <PollutantGrid readings={detail} standard={settings.aqiStandard} />

          <p className="city-detail-footnote">
            Pollutant values are ambient concentrations, not personal exposure. WHO comparisons
            use 2021 guideline values and do not replace a health risk assessment.
          </p>
        </div>

        <footer className="city-detail-footer">
          <span className="city-detail-source">
            <span
              className={`source-dot ${detail.source === "open-meteo" ? "is-live" : ""}`}
              aria-hidden="true"
            />
            {sourceLabel}
          </span>
          <div className="city-detail-actions">
            {onUseCity && (
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => {
                  onUseCity(detail.city);
                  onClose();
                }}
              >
                Use this city for my plan
                <Icon name="arrow-right" size={15} />
              </button>
            )}
            <button type="button" className="button button--dark button--small" onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
