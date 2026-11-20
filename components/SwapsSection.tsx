"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { Advice, AirReading, Profile } from "@/lib/types";
import { Icon } from "./Icon";

export function SwapsSection({ advice }: { advice: Advice }) {
  return (
    <section id="swaps" className="section swaps-section" aria-labelledby="swaps-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Sustainable swaps</span>
          <h2 id="swaps-title">Small swaps with a paper trail.</h2>
        </div>
        <p className="section-intro">
          Chosen for your home, commute and budget — each with an estimated carbon, exposure or
          cost effect.
        </p>
      </div>

      <div className="swap-grid">
        {advice.swaps.map((swap, index) => (
          <article key={swap.id} className="swap-card">
            <div className="swap-top">
              <span className="swap-number">{String(index + 1).padStart(2, "0")}</span>
              <span className={`swap-fit ${swap.fit === "best-fit" ? "is-best" : ""}`}>
                {swap.fit === "best-fit" ? "Best fit" : "Good fit"}
              </span>
            </div>
            <h3>{swap.title}</h3>
            <p>{swap.description}</p>
            <dl className="swap-impact">
              <div>
                <dt>Impact</dt>
                <dd>{swap.impact}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{swap.cost}</dd>
              </div>
            </dl>
            <a href="#choices" className="text-link">
              Model it in the choices lab <Icon name="arrow-right" size={15} />
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
  const [status, setStatus] = useState("");
  const message = `Hi neighbours — ${profile.city.name} is at AQI ${formatNumber(
    air.aqi,
  )} today. The cleanest window is ${advice.windows.best.label} (AQI ≈ ${
    advice.windows.best.aqi
  }). Could we keep the gate and school drop-off idling-free today, and avoid burning leaves or waste? I've made a short household plan with Saans — happy to share it.`;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus("Note copied. Paste it into your building or school group.");
    } catch {
      setStatus("Copy is not available in this browser. Select the note text and copy it manually.");
    }
  }

  return (
    <section id="community" className="section community-section" aria-labelledby="community-title">
      <div className="community-shell">
        <div className="community-copy">
          <span className="eyebrow eyebrow--light">Clean-air circle</span>
          <h2 id="community-title">A cleaner street is a team sport.</h2>
          <p>
            Households can cut their own exposure. Neighbourhoods can change the air everyone
            shares. Start with one rule, one shared room or one message.
          </p>

          <ul className="community-list">
            <li>
              <span>01</span>
              <div>
                <strong>Make the gate idle-free</strong>
                <p>Ask drivers to switch off while waiting at school, the clinic or the building entrance.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Ban the burn</strong>
                <p>No leaves, waste or plastic fires in the compound. Report roadside burning on your municipal channel.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Create one clean-air corner</strong>
                <p>A filtered room in a community centre gives children and older residents somewhere to retreat.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="community-note">
          <div className="note-head">
            <span className="note-label">Ready-to-send neighbour note</span>
            <span className="note-city">{profile.city.name}</span>
          </div>
          <blockquote>{message}</blockquote>
          <div className="note-actions">
            <button type="button" className="button button--lime" onClick={copyMessage}>
              <Icon name="copy" size={17} />
              Copy note
            </button>
            <span className="note-meta">
              No sign-up · your neighbours see only what you paste
            </span>
          </div>
          <p className="note-status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
