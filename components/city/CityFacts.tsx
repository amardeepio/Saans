"use client";

import { formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import type { AqiMeasurement, Locale, WeatherSnapshot } from "@/lib/types";
import { WeatherGlyph } from "../WeatherGlyph";

interface CityAqiBadgeProps {
  measurement: AqiMeasurement;
  /** "panel" appends the category label under the scale. */
  variant?: "dialog" | "panel";
}

export function CityAqiBadge({ measurement, variant = "dialog" }: CityAqiBadgeProps) {
  const className =
    variant === "panel" ? "dashboard-selected-aqi" : `city-detail-aqi tone-${measurement.tone}`;
  return (
    <div className={className}>
      <strong>{formatNumber(measurement.value)}</strong>
      <span>
        {variant === "panel"
          ? `${measurement.scaleLabel} · ${measurement.label}`
          : measurement.scaleLabel}
      </span>
    </div>
  );
}

interface CityWeatherFactsProps {
  weather: WeatherSnapshot;
  locale: Locale;
  variant: "dialog" | "panel";
}

export function CityWeatherFacts({ weather, locale, variant }: CityWeatherFactsProps) {
  const temperature = Math.round(weather.temperatureC);
  const apparent = Math.round(weather.apparentTemperatureC);

  if (variant === "panel") {
    return (
      <div className="dashboard-selected-weather">
        <WeatherGlyph code={weather.code} size={22} />
        <div>
          <strong>{temperature}°C</strong>
          <span>
            {translate(locale, "dashboard.weatherLine", { label: weather.label, temp: apparent })}
          </span>
          <small>
            {translate(locale, "dashboard.weatherMeta", {
              humidity: weather.humidity,
              wind: weather.windKph,
            })}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="city-detail-weather" aria-label={translate(locale, "cityReport.weather")}>
      <span className="city-detail-weather-icon">
        <WeatherGlyph code={weather.code} size={21} />
      </span>
      <strong>{temperature}°C</strong>
      <span>{weather.label}</span>
      <span className="city-detail-weather-extra">
        {translate(locale, "cityReport.feels", { temp: apparent })}
      </span>
      <span className="city-detail-weather-extra">
        {translate(locale, "cityReport.humidity", { value: weather.humidity })}
      </span>
      <span className="city-detail-weather-extra">
        {translate(locale, "cityReport.wind", { value: weather.windKph })}
      </span>
    </div>
  );
}

export function CityPollutantNote({
  locale,
  variant,
}: {
  locale: Locale;
  variant: "dialog" | "panel";
}) {
  return (
    <p className={variant === "dialog" ? "city-detail-footnote" : "dashboard-detail-note"}>
      {translate(locale, variant === "dialog" ? "cityReport.note" : "dashboard.note")}
    </p>
  );
}
