"use client";

import { useMemo, useState } from "react";
import { formatDecimal, formatInr, formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { measurementFor } from "@/lib/measurement";
import type { Advice, AirReading, Locale, Profile } from "@/lib/types";
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

function buildOptions(profile: Profile, advice: Advice, locale: Locale): SimOption[] {
  const options: SimOption[] = [];
  const transit = advice.swaps.find((swap) => swap.id === "one-transit-day");
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  if (profile.mobility.primary === "car" || profile.mobility.primary === "two-wheeler") {
    options.push({
      id: "transit",
      label: t("choices.transit.label"),
      description: t("choices.transit.description"),
      exposure: 5,
      co2e: transit?.co2eKgMonth ?? 6,
      cost: transit ? transit.co2eKgMonth * 22 : 150,
    });
  }

  if (profile.home.indoorSmoke !== "none") {
    options.push({
      id: "no-burn",
      label: t("choices.noBurn.label"),
      description: t("choices.noBurn.description"),
      exposure: 10,
      co2e: 0.6,
      cost: 0,
    });
  }

  if (profile.home.purifier === "none") {
    options.push({
      id: "clean-room",
      label: t("choices.cleanRoom.label"),
      description: t("choices.cleanRoom.description"),
      exposure: 18,
      co2e: 8,
      cost: -380,
    });
  }

  options.push({
    id: "clean-window",
    label: t("choices.cleanWindow.label"),
    description: t("choices.cleanWindow.description", { window: advice.windows.best.label }),
    exposure: 7,
    co2e: 0,
    cost: 0,
  });

  options.push({
    id: "pressure-cooker",
    label: t("choices.pressureCooker.label"),
    description: t("choices.pressureCooker.description"),
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
  const locale = settings.locale;
  const measurement = measurementFor(settings.aqiStandard, air);
  const options = useMemo(() => buildOptions(profile, advice, locale), [profile, advice, locale]);
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
          <span className="eyebrow">{translate(locale, "choices.eyebrow")}</span>
          <h2 id="choices-title">{translate(locale, "choices.title")}</h2>
        </div>
        <p className="section-intro">{translate(locale, "choices.intro")}</p>
      </div>

      <div className="lab-layout">
        <div
          className="lab-options"
          role="group"
          aria-label={translate(locale, "choices.group")}
        >
          {options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className={`lab-option ${checked ? "is-checked" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(option.id)} />
                <span className="lab-check" aria-hidden="true">
                  {checked ? <Icon name="check" size={15} /> : null}
                </span>
                <span className="lab-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  <span className="lab-option-impact">
                    {option.exposure > 0 &&
                      translate(locale, "choices.impactExposure", { pct: option.exposure })}
                    {option.co2e > 0 &&
                      ` · ${translate(locale, "choices.impactCo2e", {
                        value: formatDecimal(option.co2e),
                      })}`}
                    {option.cost > 0 &&
                      ` · ${translate(locale, "choices.impactSaved", {
                        amount: formatInr(option.cost),
                      })}`}
                    {option.cost < 0 &&
                      ` · ${translate(locale, "choices.impactCost", {
                        amount: formatInr(option.cost),
                      })}`}
                  </span>
                </span>
              </label>
            );
          })}
          {selected.length > 0 && (
            <button type="button" className="reset-button" onClick={() => setSelected([])}>
              {translate(locale, "choices.reset")}
            </button>
          )}
        </div>

        <div className="lab-result" aria-live="polite">
          <div className="lab-result-top">
            <span className="eyebrow eyebrow--light">{translate(locale, "choices.result")}</span>
            <span className="lab-city">
              {profile.city.name} · {measurement.scaleLabel} {formatNumber(measurement.value)}
            </span>
          </div>
          {selected.length === 0 ? (
            <div className="lab-empty">
              <span className="lab-empty-mark" aria-hidden="true">
                <Icon name="spark" size={28} />
              </span>
              <h3>{translate(locale, "choices.emptyTitle")}</h3>
              <p>{translate(locale, "choices.emptyBody")}</p>
              <span className="lab-hint">
                {translate(locale, "choices.emptyHint", { pct: advice.ledger.exposurePct })}
              </span>
            </div>
          ) : (
            <>
              <div className="lab-big-number">
                <strong>{exposure}%</strong>
                <span>{translate(locale, "choices.exposureResult")}</span>
              </div>
              <div className="sim-meters">
                <Meter
                  label={translate(locale, "choices.exposure")}
                  value={exposure}
                  max={48}
                  display={translate(locale, "choices.lower", { value: exposure })}
                  tone="lime"
                />
                <Meter
                  label={translate(locale, "choices.carbon")}
                  value={co2e}
                  max={36}
                  display={translate(locale, "choices.perMonth", { value: formatDecimal(co2e) })}
                  tone="sky"
                />
                <Meter
                  label={translate(locale, "choices.money")}
                  value={Math.abs(cost)}
                  max={600}
                  display={
                    cost >= 0
                      ? translate(locale, "choices.savedPerMonth", {
                          amount: formatInr(cost),
                        })
                      : translate(locale, "choices.costPerMonth", {
                          amount: formatInr(cost),
                        })
                  }
                  tone="cream"
                />
              </div>
              <div className="lab-equivalent">
                <Icon name="leaf" size={18} />
                <p>{translate(locale, "choices.equivalent", { km: formatNumber(carKm) })}</p>
              </div>
            </>
          )}
          <p className="lab-disclaimer">{translate(locale, "choices.disclaimer")}</p>
        </div>
      </div>
    </section>
  );
}
