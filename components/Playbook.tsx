import { sensitiveGroups } from "@/lib/aqi";
import { formatDecimal, formatInr, formatObservedAt, formatNumber } from "@/lib/format";
import type { Advice, AirReading, PlanAction, Profile } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

const CATEGORY_ICONS: Record<PlanAction["category"], IconName> = {
  health: "shield",
  home: "home",
  mobility: "mobility",
  sustainability: "leaf",
  community: "users",
};

function ImpactChips({ action }: { action: PlanAction }) {
  return (
    <div className="impact-chips" aria-label="Estimated impact">
      {action.impact.exposurePct > 0 && (
        <span className="impact-chip impact-chip--health">
          <Icon name="shield" size={13} />
          ≈{action.impact.exposurePct}% less exposure
        </span>
      )}
      {action.impact.co2eKgMonth > 0 && (
        <span className="impact-chip impact-chip--planet">
          <Icon name="leaf" size={13} />
          {formatDecimal(action.impact.co2eKgMonth)} kg CO₂e/mo
        </span>
      )}
      {action.impact.costInrMonth > 0 && (
        <span className="impact-chip impact-chip--cost">
          {formatInr(action.impact.costInrMonth)} saved/mo
        </span>
      )}
      {action.impact.costInrMonth < 0 && (
        <span className="impact-chip impact-chip--cost">
          ≈{formatInr(action.impact.costInrMonth)}/mo
        </span>
      )}
    </div>
  );
}

function ActionItem({
  action,
  top,
  index,
}: {
  action: PlanAction;
  top: boolean;
  index: number;
}) {
  return (
    <li className={`timeline-item ${top ? "is-top" : ""}`}>
      <div className="timeline-marker" aria-hidden="true">
        <span className={`timeline-dot category-${action.category}`} />
      </div>
      <details className="action-detail" open={index === 0}>
        <summary>
          <div className="action-summary-main">
            <div className="action-meta">
              <span className="action-time">
                <Icon name="clock" size={13} />
                {action.timeLabel}
              </span>
              <span className={`action-category category-${action.category}`}>
                <Icon name={CATEGORY_ICONS[action.category]} size={13} />
                {action.categoryLabel}
              </span>
              {top && <span className="start-here">Start here</span>}
            </div>
            <h3>{action.title}</h3>
            <p>{action.summary}</p>
            <ImpactChips action={action} />
          </div>
          <span className="detail-chevron" aria-hidden="true">
            <Icon name="chevron" size={18} />
          </span>
        </summary>
        <div className="action-expanded">
          <div className="action-steps">
            <span className="micro-label">Do this</span>
            <ol>
              {action.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="action-why">
            <span className="micro-label">Why it works</span>
            <p>{action.why}</p>
            <div className="action-tags">
              {action.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </details>
    </li>
  );
}

function WindowCard({ advice }: { advice: Advice }) {
  const best = advice.windows.best;
  const worst = advice.windows.worst;
  return (
    <div className="rail-card windows-card">
      <div className="rail-heading">
        <span className="eyebrow">Outdoor clock</span>
        <Icon name="sun" size={18} />
      </div>
      <div className="window-row window-row--best">
        <div>
          <span className="window-kicker">Cleanest window</span>
          <strong>{best.label}</strong>
          <small>AQI ≈ {formatNumber(best.aqi)}</small>
        </div>
        <span className={`window-badge verdict-${best.verdict}`}>
          {best.verdict === "good" ? "Go outside" : best.verdict === "short" ? "Keep it short" : "Stay in"}
        </span>
      </div>
      <p className="window-detail">{best.detail}</p>
      <div className="window-row window-row--worst">
        <div>
          <span className="window-kicker">Roughest air</span>
          <strong>{worst.label}</strong>
          <small>AQI ≈ {formatNumber(worst.aqi)}</small>
        </div>
      </div>
    </div>
  );
}

function LedgerCard({ advice }: { advice: Advice }) {
  const ledger = advice.ledger;
  return (
    <div className="rail-card ledger-card">
      <div className="rail-heading">
        <span className="eyebrow">Your modelled impact</span>
        <Icon name="spark" size={18} />
      </div>
      <div className="ledger-hero">
        <strong>≤{ledger.exposurePct}%</strong>
        <span>less daily PM2.5 exposure, modelled, if you follow the plan</span>
      </div>
      <div className="ledger-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, ledger.exposurePct)}%` }} />
      </div>
      <dl className="ledger-list">
        <div>
          <dt>Carbon avoided</dt>
          <dd>{formatDecimal(ledger.co2eKgMonth)} kg CO₂e / mo</dd>
        </div>
        <div>
          <dt>Net monthly cost</dt>
          <dd>
            {ledger.costInrMonth >= 0
              ? `${formatInr(ledger.costInrMonth)} saved`
              : `${formatInr(ledger.costInrMonth)} cost`}
          </dd>
        </div>
        <div>
          <dt>Actions in plan</dt>
          <dd>{ledger.actionsCount} tuned to your week</dd>
        </div>
      </dl>
      <details className="method-note">
        <summary>
          <Icon name="info" size={14} /> How these estimates work
        </summary>
        <p>
          Exposure reductions are rough, additive-with-diminishing-returns comparisons between
          actions. They are not measurements, medical advice or a guarantee. Carbon and cost
          figures use typical Indian fuel and electricity assumptions and will vary by home.
        </p>
      </details>
    </div>
  );
}

export function Playbook({
  profile,
  air,
  advice,
}: {
  profile: Profile;
  air: AirReading;
  advice: Advice;
}) {
  const groups = sensitiveGroups(profile.household);
  const sourceLabel =
    air.source === "open-meteo" ? "Live Open-Meteo reading" : "Sample winter pattern";

  return (
    <section id="playbook" className="section playbook-section" aria-labelledby="playbook-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">The daily playbook</span>
          <h2 id="playbook-title">Today, in the order it happens.</h2>
        </div>
        <p className="section-intro">
          {advice.actions.length} practical moves, weighted for your household and budget. Open any
          card for the steps and the reasoning.
        </p>
      </div>

      <div className="playbook-layout">
        <ol className="timeline" aria-label="Today's actions in time order">
          {advice.actions.map((action, index) => (
            <ActionItem
              key={action.id}
              action={action}
              top={action.id === advice.topAction.id}
              index={index}
            />
          ))}
        </ol>

        <aside className="playbook-rail" aria-label="Today's context">
          <div className={`rail-card risk-card risk-${advice.risk}`}>
            <div className="rail-heading">
              <span className="eyebrow">Household read</span>
              <span className="risk-dot" aria-hidden="true" />
            </div>
            <h3>{advice.riskLabel}</h3>
            <p>
              {groups.length > 0
                ? `Extra care is weighted for ${groups.join(", ")}.`
                : "No sensitive groups were added, so the plan focuses on broad, low-effort protection."}
            </p>
            {advice.alert && <div className="alert-note">{advice.alert}</div>}
          </div>

          <WindowCard advice={advice} />
          <LedgerCard advice={advice} />

          <div className="rail-card source-card">
            <span className="eyebrow">Behind the reading</span>
            <p>
              <strong>{sourceLabel}</strong> · {formatObservedAt(air.observedAt)}
            </p>
            <p className="source-detail">
              PM2.5 {formatDecimal(air.pm25)} µg/m³ · PM10 {formatDecimal(air.pm10)} µg/m³
            </p>
            <details className="method-note">
              <summary>
                <Icon name="info" size={14} /> About the numbers
              </summary>
              <p>
                AQI follows the US EPA scale, calculated from PM2.5 when the provider does not
                return it. The forecast clock uses the next 24 hourly points. Click the playbook
                for the assumptions behind each action.
              </p>
            </details>
          </div>
        </aside>
      </div>
    </section>
  );
}
