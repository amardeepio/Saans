"use client";

import { translate } from "@/lib/i18n";
import type { Advice, AirReading, Locale, Profile } from "@/lib/types";
import { AqiOrb } from "../AqiOrb";
import { Icon } from "../Icon";
import { ShareRow } from "../ShareRow";
import { WeatherGlyph } from "../WeatherGlyph";

interface HomeHeroProps {
  profile: Profile;
  air: AirReading | null;
  airLoading: boolean;
  advice: Advice | null;
  locale: Locale;
  onOpenSetup: () => void;
}

export function HomeHero({
  profile,
  air,
  airLoading,
  advice,
  locale,
  onOpenSetup,
}: HomeHeroProps) {
  const cityTitle = `${profile.city.name}${profile.city.region ? `, ${profile.city.region}` : ""}`;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-line" aria-hidden="true" />
          {translate(locale, "hero.eyebrow")}
        </div>
        <h1 id="hero-title">
          {translate(locale, "hero.titleA")}
          <br />
          {translate(locale, "hero.titleB")}
        </h1>
        <p className="hero-lede">{translate(locale, "hero.lede")}</p>
        {advice && (
          <div className="hero-share">
            <ShareRow
              title={cityTitle}
              value={advice.measurement.value}
              scaleLabel={advice.measurement.scaleLabel}
              label={advice.measurement.label}
              windowLabel={advice.windows.best.label}
            />
          </div>
        )}
        <div className="hero-actions">
          <a className="button button--dark" href="#playbook">
            {translate(locale, "hero.seePlan")}
            <Icon name="arrow" size={18} />
          </a>
          <button type="button" className="button button--quiet" onClick={onOpenSetup}>
            <Icon name="users" size={17} />
            {translate(locale, "hero.personalize")}
          </button>
        </div>
        <div className="hero-trust">
          <span>
            <Icon name="shield" size={15} /> {translate(locale, "hero.noAccount")}
          </span>
          <span>
            <Icon name="wind" size={15} /> {translate(locale, "hero.location")}
          </span>
          <span>
            <Icon name="leaf" size={15} /> {translate(locale, "hero.impact")}
          </span>
        </div>
      </div>

      <div className="hero-visual">
        <div className="air-card">
          <div className="air-card-head">
            <div>
              <span className="eyebrow">{translate(locale, "hero.airNow")}</span>
              <h2>{cityTitle}</h2>
              {air && (
                <p className="air-weather-line">
                  <WeatherGlyph code={air.weather.code} size={16} />
                  <strong>{Math.round(air.weather.temperatureC)}°C</strong>
                  <span>{air.weather.label}</span>
                  <span className="air-weather-feels">
                    Feels {Math.round(air.weather.apparentTemperatureC)}° · {air.weather.humidity}%
                    humidity
                  </span>
                </p>
              )}
            </div>
            <button type="button" className="air-location-button" onClick={onOpenSetup}>
              <Icon name="pin" size={15} />
              {translate(locale, "hero.change")}
            </button>
          </div>
          <AqiOrb air={air} locale={locale} loading={airLoading} />
          {air && advice && (
            <p className="air-category-advice">
              {advice.measurement.label}. {advice.alert ?? advice.atmosphere.ventilationAdvice}
            </p>
          )}
          <div className="air-card-footer">
            <span>{translate(locale, "hero.bestWindow")}</span>
            <strong>{advice ? advice.windows.best.label : translate(locale, "common.loading")}</strong>
          </div>
        </div>

        <div className="hero-note">
          <span className="hero-note-mark" aria-hidden="true">
            <Icon name="spark" size={18} />
          </span>
          <div>
            <span className="eyebrow">{translate(locale, "hero.oneThing")}</span>
            <p>{advice ? advice.topAction.title : translate(locale, "common.loading")}</p>
            {advice && (
              <a href="#playbook">
                {translate(locale, "hero.openPlaybook")} <Icon name="arrow-right" size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
