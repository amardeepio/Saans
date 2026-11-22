"use client";

import { formatDecimal, formatInr } from "@/lib/format";
import { translate } from "@/lib/i18n";
import type { Advice, Locale } from "@/lib/types";
import { Icon } from "../Icon";

interface ImpactRibbonProps {
  advice: Advice | null;
  personalized: boolean;
  locale: Locale;
  onOpenSetup: () => void;
}

export function ImpactRibbon({
  advice,
  personalized,
  locale,
  onOpenSetup,
}: ImpactRibbonProps) {
  return (
    <>
      <section className="impact-ribbon" aria-label={translate(locale, "impactRibbon.label")}>
        <div className="ribbon-intro">
          <span className="eyebrow">{translate(locale, "ribbon.title")}</span>
          <p>
            {personalized
              ? translate(locale, "ribbon.tuned")
              : translate(locale, "ribbon.demo")}
          </p>
        </div>
        <div className="ribbon-stat">
          <span className="ribbon-icon ribbon-icon--lime">
            <Icon name="shield" size={17} />
          </span>
          <div>
            <strong>{advice ? `≤${advice.ledger.exposurePct}%` : "—"}</strong>
            <span>{translate(locale, "ribbon.exposure")}</span>
          </div>
        </div>
        <div className="ribbon-stat">
          <span className="ribbon-icon ribbon-icon--sky">
            <Icon name="leaf" size={17} />
          </span>
          <div>
            <strong>{advice ? `${formatDecimal(advice.ledger.co2eKgMonth)} kg` : "—"}</strong>
            <span>{translate(locale, "ribbon.carbon")}</span>
          </div>
        </div>
        <div className="ribbon-stat">
          <span className="ribbon-icon ribbon-icon--cream">
            <Icon name="clock" size={17} />
          </span>
          <div>
            <strong>{advice ? advice.windows.best.label : "—"}</strong>
            <span>{translate(locale, "ribbon.window")}</span>
          </div>
        </div>
        <div className="ribbon-stat">
          <span className="ribbon-icon ribbon-icon--clay">
            <Icon name="spark" size={17} />
          </span>
          <div>
            <strong>
              {advice
                ? advice.ledger.costInrMonth >= 0
                  ? `${formatInr(advice.ledger.costInrMonth)} ${translate(locale, "ribbon.saved")}`
                  : `${formatInr(advice.ledger.costInrMonth)} ${translate(locale, "ribbon.costLabel")}`
                : "—"}
            </strong>
            <span>{translate(locale, "ribbon.cost")}</span>
          </div>
        </div>
        <button
          type="button"
          className="ribbon-edit"
          onClick={onOpenSetup}
          aria-label={translate(locale, "impactRibbon.editProfile")}
        >
          <Icon name="arrow-right" size={18} />
        </button>
      </section>

      {!personalized && (
        <div className="demo-banner" role="note">
          <div>
            <span className="demo-dot" aria-hidden="true" />
            <p>
              <strong>{translate(locale, "demo.title")}</strong>{" "}
              {translate(locale, "demo.body")}
            </p>
          </div>
          <button type="button" className="text-link" onClick={onOpenSetup}>
            {translate(locale, "demo.cta")} <Icon name="arrow-right" size={15} />
          </button>
        </div>
      )}
    </>
  );
}
