"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { aqiCategory } from "@/lib/aqi";
import { CITIES } from "@/lib/cities";
import { sampleReading } from "@/lib/sample-air";
import { formatNumber } from "@/lib/format";
import type { City, CityDetail } from "@/lib/types";
import { CityDetailDialog } from "./CityDetailDialog";
import { Icon } from "./Icon";
import { WeatherGlyph } from "./WeatherGlyph";

const METRO_IDS = ["mumbai", "delhi", "chennai", "kolkata", "bengaluru"];

function samplePulse(): CityDetail[] {
  return METRO_IDS.flatMap((id) => {
    const city = CITIES.find((item) => item.id === id);
    if (!city) return [];
    const reading = sampleReading(city);
    const { hourly: _hourly, ...detail } = reading;
    return [detail];
  });
}

export function CityPulse({ onUseCity }: { onUseCity: (city: City) => void }) {
  const [cities, setCities] = useState<CityDetail[] | null>(null);
  const [selected, setSelected] = useState<CityDetail | null>(null);
  const fallback = useMemo(() => samplePulse(), []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]);

    fetch("/api/cities", { signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("cities");
        const data = (await response.json()) as { cities?: CityDetail[] };
        if (!Array.isArray(data.cities) || data.cities.length < 5) throw new Error("cities-format");
        return data.cities;
      })
      .then((items) => setCities(items))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setCities(fallback);
      });

    return () => controller.abort();
  }, [fallback]);

  const items = cities ?? [];
  const liveCount = items.filter((item) => item.source === "open-meteo").length;
  const freshness = cities
    ? liveCount === items.length
      ? "Live · Open-Meteo"
      : liveCount > 0
        ? "Partly live"
        : "Sample pattern"
    : "Reading cities…";

  return (
    <>
      <section className="city-pulse" aria-labelledby="city-pulse-title">
        <div className="city-pulse-inner">
          <div className="city-pulse-intro">
            <span className="eyebrow" id="city-pulse-title">
              Metro pulse
            </span>
            <span className="city-pulse-units">AQI · °C</span>
            <Link href="/dashboard" className="city-pulse-all">
              Dashboard <Icon name="arrow-right" size={12} />
            </Link>
          </div>
          <ul
            className="city-pulse-list"
            aria-busy={!cities}
            aria-label="Metro air quality and temperature. Open a city for pollutants and weather."
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
                  const tone = aqiCategory(item.aqi).tone;
                  const category = aqiCategory(item.aqi);
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
                          <span className="city-pulse-aqi">{formatNumber(item.aqi)}</span>
                          <span className="city-pulse-category">{category.shortLabel}</span>
                        </div>
                        <span className="city-pulse-chevron" aria-hidden="true">
                          <Icon name="chevron" size={14} />
                        </span>
                        <span className="sr-only">Open air report</span>
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
