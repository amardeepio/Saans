"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchJson, isAbortError } from "@/lib/client-fetch";
import { CITIES } from "@/lib/cities";
import { CLIENT_TIMEOUT_MS } from "@/lib/constants";
import { translate } from "@/lib/i18n";
import { measurementFor } from "@/lib/measurement";
import { sampleReading } from "@/lib/sample-air";
import { sourceStatusLabel } from "@/lib/source";
import { toCityDetail } from "@/lib/india";
import { formatNumber } from "@/lib/format";
import type { City, CityDetail } from "@/lib/types";
import { CityDetailDialog } from "./CityDetailDialog";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";
import { WeatherGlyph } from "./WeatherGlyph";

const METRO_IDS = ["mumbai", "delhi", "chennai", "kolkata", "bengaluru"];

function samplePulse(): CityDetail[] {
  return METRO_IDS.flatMap((id) => {
    const city = CITIES.find((item) => item.id === id);
    return city ? [toCityDetail(sampleReading(city))] : [];
  });
}

export function CityPulse({ onUseCity }: { onUseCity: (city: City) => void }) {
  const { settings } = usePreferences();
  const [cities, setCities] = useState<CityDetail[] | null>(null);
  const [selected, setSelected] = useState<CityDetail | null>(null);
  const fallback = useMemo(() => samplePulse(), []);

  useEffect(() => {
    const controller = new AbortController();

    fetchJson<{ cities?: CityDetail[] }>("/api/cities", {
      signal: controller.signal,
      timeoutMs: CLIENT_TIMEOUT_MS.geocode,
    })
      .then((data) => {
        if (!Array.isArray(data.cities) || data.cities.length < 5) {
          throw new Error("cities-format");
        }
        setCities(data.cities);
      })
      .catch((error) => {
        if (!isAbortError(error)) setCities(fallback);
      });

    return () => controller.abort();
  }, [fallback]);

  const items = cities ?? [];
  const liveCount = items.filter((item) => item.source === "open-meteo").length;
  const freshness = cities
    ? sourceStatusLabel(liveCount, items.length, settings.locale)
    : translate(settings.locale, "source.reading");

  return (
    <>
      <section className="city-pulse" aria-labelledby="city-pulse-title">
        <div className="city-pulse-inner">
          <div className="city-pulse-intro">
            <span className="eyebrow" id="city-pulse-title">
              {translate(settings.locale, "cityPulse.title")}
            </span>
            <span className="city-pulse-units">
              {settings.aqiStandard === "naqi" ? "NAQI" : "AQI"} · °C
            </span>
            <Link href="/dashboard" className="city-pulse-all">
              {translate(settings.locale, "nav.dashboard")} <Icon name="arrow-right" size={12} />
            </Link>
          </div>
          <ul
            className="city-pulse-list"
            aria-busy={!cities}
            aria-label={translate(settings.locale, "cityPulse.listLabel")}
          >
            {items.length === 0
              ? METRO_IDS.map((id) => (
                  <li
                    key={id}
                    className="city-pulse-item city-pulse-item--loading"
                    aria-hidden="true"
                  >
                    <span className="city-pulse-skeleton" />
                  </li>
                ))
              : items.map((item) => {
                  const measurement = measurementFor(settings.aqiStandard, item);
                  const tone = measurement.tone;
                  return (
                    <li key={item.city.id}>
                      <button
                        type="button"
                        className="city-pulse-item city-pulse-button"
                        onClick={() => setSelected(item)}
                      >
                        <div className="city-pulse-name">
                          <span>{item.city.name}</span>
                          <span className="city-pulse-weather" title={item.weather.label}>
                            <WeatherGlyph code={item.weather.code} size={14} />
                            {Math.round(item.weather.temperatureC)}°C
                          </span>
                        </div>
                        <div className={`city-pulse-reading tone-${tone}`}>
                          <span className="city-pulse-aqi">{formatNumber(measurement.value)}</span>
                          <span className="city-pulse-category">{measurement.shortLabel}</span>
                        </div>
                        <span className="city-pulse-chevron" aria-hidden="true">
                          <Icon name="chevron" size={14} />
                        </span>
                        <span className="sr-only">
                          {translate(settings.locale, "cityPulse.openReport")}
                        </span>
                      </button>
                    </li>
                  );
                })}
          </ul>
          <span className="city-pulse-source">
            <span
              className={`source-dot ${liveCount === items.length ? "is-live" : ""}`}
              aria-hidden="true"
            />
            {freshness}
          </span>
        </div>
      </section>

      {selected && (
        <CityDetailDialog
          detail={selected}
          onClose={() => setSelected(null)}
          onUseCity={onUseCity}
        />
      )}
    </>
  );
}
