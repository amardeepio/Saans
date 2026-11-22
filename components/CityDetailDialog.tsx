"use client";

import { useEffect, useRef } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { formatObservedAt } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { measurementFor } from "@/lib/measurement";
import type { City, CityDetail } from "@/lib/types";
import { CityAqiBadge, CityPollutantNote, CityWeatherFacts } from "./city/CityFacts";
import { Icon } from "./Icon";
import { PollutantGrid } from "./PollutantGrid";
import { usePreferences } from "./PreferencesProvider";

interface CityDetailDialogProps {
  detail: CityDetail;
  onClose: () => void;
  onUseCity?: (city: City) => void;
}

export function CityDetailDialog({ detail, onClose, onUseCity }: CityDetailDialogProps) {
  const { settings } = usePreferences();
  const locale = settings.locale;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const measurement = measurementFor(settings.aqiStandard, detail);
  const sourceLabel =
    detail.source === "open-meteo"
      ? translate(locale, "source.live")
      : translate(locale, "cityReport.sampleSource");

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
            <span className="eyebrow eyebrow--light">{translate(locale, "cityReport.eyebrow")}</span>
            <button
              ref={closeRef}
              type="button"
              className="city-detail-close"
              onClick={onClose}
              aria-label={translate(locale, "cityReport.close")}
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
            <CityAqiBadge measurement={measurement} />
          </div>

          <CityWeatherFacts weather={detail.weather} locale={locale} variant="dialog" />

          <p id="city-detail-description" className="city-detail-category">
            <strong>{measurement.label}.</strong> {measurement.advice}
          </p>
        </header>

        <div className="city-detail-body">
          <div className="city-detail-section-head">
            <div>
              <span className="eyebrow">{translate(locale, "cityReport.pollutants")}</span>
              <h3>{translate(locale, "cityReport.whatsInAir")}</h3>
            </div>
            <span className="city-detail-unit-note">{translate(locale, "cityReport.who")}</span>
          </div>

          <PollutantGrid readings={detail} standard={settings.aqiStandard} />
          <CityPollutantNote locale={locale} variant="dialog" />
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
                {translate(locale, "cityReport.useCity")}
                <Icon name="arrow-right" size={15} />
              </button>
            )}
            <button type="button" className="button button--dark button--small" onClick={onClose}>
              {translate(locale, "common.done")}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
