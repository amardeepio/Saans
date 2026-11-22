"use client";

import type { RefObject } from "react";
import { formatObservedAt } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { measurementFor } from "@/lib/measurement";
import type { AqiStandard, CityDetail, Locale } from "@/lib/types";
import { CityAqiBadge, CityPollutantNote, CityWeatherFacts } from "../city/CityFacts";
import { GrapNotice } from "../GrapNotice";
import { Icon } from "../Icon";
import { PollutantGrid } from "../PollutantGrid";
import { ShareRow } from "../ShareRow";

interface CityDetailPanelProps {
  detailRef: RefObject<HTMLDivElement | null>;
  selected: CityDetail | null;
  standard: AqiStandard;
  locale: Locale;
}

export function CityDetailPanel({ detailRef, selected, standard, locale }: CityDetailPanelProps) {
  const measurement = selected ? measurementFor(standard, selected) : null;

  return (
    <section
      ref={detailRef}
      id="city-detail-panel"
      className="dashboard-detail-panel"
      aria-labelledby="selected-city-title"
    >
      <p className="sr-only" aria-live="polite">
        {selected ? translate(locale, "dashboard.showing", { city: selected.city.name }) : ""}
      </p>
      {selected && measurement ? (
        <>
          <div className="dashboard-panel-head">
            <div>
              <span className="eyebrow">{translate(locale, "dashboard.pollutantWatch")}</span>
              <h2 id="selected-city-title">{selected.city.name}</h2>
            </div>
            <span className="dashboard-detail-source">
              <span
                className={`source-dot ${selected.source === "open-meteo" ? "is-live" : ""}`}
                aria-hidden="true"
              />
              {selected.source === "open-meteo"
                ? translate(locale, "source.liveShort")
                : translate(locale, "source.sampleShort")}
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
            <CityAqiBadge measurement={measurement} variant="panel" />
            <CityWeatherFacts weather={selected.weather} locale={locale} variant="panel" />
          </div>

          <p className="dashboard-selected-advice">
            {measurement.advice}{" "}
            {translate(locale, "dashboard.adviceTail", {
              time: formatObservedAt(selected.observedAt),
            })}
          </p>

          <GrapNotice grap={measurement.grap} />
          <PollutantGrid readings={selected} standard={standard} />
          <CityPollutantNote locale={locale} variant="panel" />
        </>
      ) : (
        <div className="dashboard-detail-empty">
          <span>
            <Icon name="wind" size={26} />
          </span>
          <h2 id="selected-city-title">{translate(locale, "dashboard.emptyTitle")}</h2>
          <p>{translate(locale, "dashboard.emptyBody")}</p>
        </div>
      )}
    </section>
  );
}
