"use client";

import { useMemo, useState } from "react";
import { formatDecimal, formatInr, formatNumber } from "@/lib/format";
import { measurementFor } from "@/lib/measurement";
import type { Advice, AirReading, Profile } from "@/lib/types";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

interface SimOption {
  id: string;
  label: string;
  description: string;
  exposure: number;
  co2e: number;
  cost: number;
}

function buildOptions(profile: Profile, advice: Advice): SimOption[] {
  const options: SimOption[] = [];
  const transit = advice.swaps.find((swap) => swap.id === "one-transit-day");

  if (profile.mobility.primary === "car" || profile.mobility.primary === "two-wheeler") {
    options.push({
      id: "transit",
      label: "One transit day a week",
      description: "Leave the private vehicle at home for the cleanest commute day.",
      exposure: 5,
      co2e: transit?.co2eKgMonth ?? 6,
      cost: transit ? transit.co2eKgMonth * 22 : 150,
    });
  }

  if (profile.home.indoorSmoke !== "none") {
    options.push({
      id: "no-burn",
      label: "Stop indoor burning",
      description: "No incense, coils, candles or solid fuel inside the home.",
      exposure: 10,
      co2e: 0.6,
      cost: 0,
    });
  }

  if (profile.home.purifier === "none") {
    options.push({
      id: "clean-room",
      label: "Filter one bedroom",
      description: "A sealed room with a correctly sized HEPA purifier overnight.",
      exposure: 18,
      co2e: 8,
      cost: -380,
    });
  }

  options.push({
    id: "clean-window",
    label: "Move outdoor time to the cleaner window",
    description: `Shift a walk, play session or errand to ${advice.windows.best.label}.`,
    exposure: 7,
    co2e: 0,
    cost: 0,
  });

  options.push({
    id: "pressure-cooker",
    label: "Pressure-cook one meal a day",
    description: "Use a lid and pressure cooker to cut cooking energy and moisture.",
    exposure: 3,
    co2e: 3,
    cost: 90,
  });

  return options;
}

function Meter({
  label,
  value,
  max,
  display,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  tone: "lime" | "sky" | "cream";
}) {
  const width = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="sim-meter">
      <div className="sim-meter-top">
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <div className="sim-meter-track" aria-hidden="true">
        <span className={`sim-meter-fill fill-${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ChoiceLab({
  profile,
  air,
  advice,
}: {
  profile: Profile;
  air: AirReading;
  advice: Advice;
}) {
  const { settings } = usePreferences();
  const measurement = measurementFor(settings.aqiStandard, air);
  const options = useMemo(() => buildOptions(profile, advice), [profile, advice]);
  const [selected, setSelected] = useState<string[]>([]);

  const totals = options
    .filter((option) => selected.includes(option.id))
    .reduce(
      (sum, option) => ({
        exposure: sum.exposure + option.exposure,
        co2e: sum.co2e + option.co2e,
        cost: sum.cost + option.cost,
      }),
      { exposure: 0, co2e: 0, cost: 0 },
    );

  const exposure = Math.min(48, Math.round(totals.exposure));
  const co2e = Math.round(totals.co2e * 10) / 10;
  const carKm = Math.round((co2e * 12) / 0.17);
  const cost = Math.round(totals.cost);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <section id="choices" className="section choices-section" aria-labelledby="choices-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">The choices lab</span>
          <h2 id="choices-title">Change one thing. See the difference.</h2>
        </div>
        <p className="section-intro">
          Toggle realistic swaps for your household. The comparison updates instantly — no
          sign-up, no guesswork.
        </p>
      </div>

      <div className="lab-layout">
        <div className="lab-options" role="group" aria-label="Choose changes to compare">
          {options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className={`lab-option ${checked ? "is-checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                />
                <span className="lab-check" aria-hidden="true">
                  {checked ? <Icon name="check" size={15} /> : null}
                </span>
                <span className="lab-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  <span className="lab-option-impact">
                    {option.exposure > 0 && `≈${option.exposure}% exposure cut`}
                    {option.co2e > 0 && ` · ${formatDecimal(option.co2e)} kg CO₂e/mo`}
                    {option.cost > 0 && ` · ${formatInr(option.cost)} saved`}
                    {option.cost < 0 && ` · ${formatInr(option.cost)}/mo`}
                  </span>
                </span>
              </label>
            );
          })}
          {selected.length > 0 && (
            <button type="button" className="reset-button" onClick={() => setSelected([])}>
              Reset comparison
            </button>
          )}
        </div>

        <div className="lab-result" aria-live="polite">
          <div className="lab-result-top">
            <span className="eyebrow eyebrow--light">Modelled difference</span>
            <span className="lab-city">
              {profile.city.name} · {measurement.scaleLabel} {formatNumber(measurement.value)}
            </span>
          </div>
          {selected.length === 0 ? (
            <div className="lab-empty">
              <span className="lab-empty-mark" aria-hidden="true">
                <Icon name="spark" size={28} />
              </span>
              <h3>Your experiment starts here.</h3>
              <p>Select one or two changes to see the modelled effect on exposure, carbon and cost.</p>
              <span className="lab-hint">
                Today&apos;s full plan already models a {advice.ledger.exposurePct}% exposure
                reduction.
              </span>
            </div>
          ) : (
            <>
              <div className="lab-big-number">
                <strong>{exposure}%</strong>
                <span>less daily PM2.5 exposure from these changes</span>
              </div>
              <div className="sim-meters">
                <Meter
                  label="Exposure"
                  value={exposure}
                  max={48}
                  display={`≈${exposure}% lower`}
                  tone="lime"
                />
                <Meter
                  label="Carbon"
                  value={co2e}
                  max={36}
                  display={`${formatDecimal(co2e)} kg/mo`}
                  tone="sky"
                />
                <Meter
                  label="Money"
                  value={Math.abs(cost)}
                  max={600}
                  display={cost >= 0 ? `${formatInr(cost)} saved/mo` : `${formatInr(cost)} cost/mo`}
                  tone="cream"
                />
              </div>
              <div className="lab-equivalent">
                <Icon name="leaf" size={18} />
                <p>
                  The carbon saved over a year is roughly {formatNumber(carKm)} km of average car
                  driving avoided.
                </p>
              </div>
            </>
          )}
          <p className="lab-disclaimer">
            Directional modelling only — not a measured health outcome. Estimates use typical
            Indian fuel and appliance assumptions.
          </p>
        </div>
      </div>
    </section>
  );
}
