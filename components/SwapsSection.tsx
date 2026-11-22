"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { measurementFor } from "@/lib/measurement";
import type { Advice, AirReading, Profile } from "@/lib/types";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

export function SwapsSection({ advice }: { advice: Advice }) {
  const { settings } = usePreferences();
  const locale = settings.locale;

  return (
    <section id="swaps" className="section swaps-section" aria-labelledby="swaps-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{translate(locale, "swaps.eyebrow")}</span>
          <h2 id="swaps-title">{translate(locale, "swaps.title")}</h2>
        </div>
        <p className="section-intro">{translate(locale, "swaps.intro")}</p>
      </div>

      <div className="swap-grid">
        {advice.swaps.map((swap, index) => (
          <article key={swap.id} className="swap-card">
            <div className="swap-top">
              <span className="swap-number">{String(index + 1).padStart(2, "0")}</span>
              <span className={`swap-fit ${swap.fit === "best-fit" ? "is-best" : ""}`}>
                {swap.fit === "best-fit"
                  ? translate(locale, "swaps.bestFit")
                  : translate(locale, "swaps.goodFit")}
              </span>
            </div>
            <h3>{swap.title}</h3>
            <p>{swap.description}</p>
            <dl className="swap-impact">
              <div>
                <dt>{translate(locale, "swaps.impact")}</dt>
                <dd>{swap.impact}</dd>
              </div>
              <div>
                <dt>{translate(locale, "swaps.cost")}</dt>
                <dd>{swap.cost}</dd>
              </div>
            </dl>
            <a href="#choices" className="text-link">
              {translate(locale, "swaps.model")} <Icon name="arrow-right" size={15} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CommunitySection({
  profile,
  air,
  advice,
}: {
  profile: Profile;
  air: AirReading;
  advice: Advice;
}) {
  const { settings } = usePreferences();
  const locale = settings.locale;
  const measurement = measurementFor(settings.aqiStandard, air);
  const [status, setStatus] = useState("");
  const message = translate(locale, "community.message", {
    city: profile.city.name,
    scale: measurement.scaleLabel,
    value: formatNumber(measurement.value),
    window: advice.windows.best.label,
    aqi: formatNumber(advice.windows.best.displayAqi),
  });

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus(translate(locale, "community.copied"));
    } catch {
      setStatus(translate(locale, "community.copyFailed"));
    }
  }

  return (
    <section id="community" className="section community-section" aria-labelledby="community-title">
      <div className="community-shell">
        <div className="community-copy">
          <span className="eyebrow eyebrow--light">{translate(locale, "community.eyebrow")}</span>
          <h2 id="community-title">{translate(locale, "community.title")}</h2>
          <p>{translate(locale, "community.body")}</p>

          <ul className="community-list">
            <li>
              <span>01</span>
              <div>
                <strong>{translate(locale, "community.rule1.title")}</strong>
                <p>{translate(locale, "community.rule1.body")}</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>{translate(locale, "community.rule2.title")}</strong>
                <p>{translate(locale, "community.rule2.body")}</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>{translate(locale, "community.rule3.title")}</strong>
                <p>{translate(locale, "community.rule3.body")}</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="community-note">
          <div className="note-head">
            <span className="note-label">{translate(locale, "community.noteLabel")}</span>
            <span className="note-city">{profile.city.name}</span>
          </div>
          <blockquote>{message}</blockquote>
          <div className="note-actions">
            <button type="button" className="button button--lime" onClick={copyMessage}>
              <Icon name="copy" size={17} />
              {translate(locale, "community.copy")}
            </button>
            <span className="note-meta">{translate(locale, "community.meta")}</span>
          </div>
          <p className="note-status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
