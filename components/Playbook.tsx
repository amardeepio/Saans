import { sensitiveGroups } from "@/lib/aqi";
import { askSaans } from "@/lib/ask";
import { formatDecimal, formatInr, formatObservedAt, formatNumber } from "@/lib/format";
import type { HabitSummary } from "@/lib/habits";
import { translate } from "@/lib/i18n";
import type { Advice, AirReading, PlanAction, Profile } from "@/lib/types";
import { AirCurve } from "./AirCurve";
import { AtmosphereCard } from "./AtmosphereCard";
import { GrapNotice } from "./GrapNotice";
import { DoneToggle, HabitCard, HabitRing } from "./HabitProgress";
import { Icon, type IconName } from "./Icon";
import { ListenButton } from "./ListenButton";
import { usePreferences } from "./PreferencesProvider";

const CATEGORY_ICONS: Record<PlanAction["category"], IconName> = {
  health: "shield",
  home: "home",
  mobility: "mobility",
  sustainability: "leaf",
  community: "users",
};

function ImpactChips({ action, locale }: { action: PlanAction; locale: "en" | "hi" }) {
  return (
    <div className="impact-chips" aria-label={translate(locale, "impact.label")}>
      {action.impact.exposurePct > 0 && (
        <span className="impact-chip impact-chip--health">
          <Icon name="shield" size={13} />
          {translate(locale, "impact.exposure", { pct: action.impact.exposurePct })}
        </span>
      )}
      {action.impact.co2eKgMonth > 0 && (
        <span className="impact-chip impact-chip--planet">
          <Icon name="leaf" size={13} />
          {translate(locale, "impact.co2e", {
            value: formatDecimal(action.impact.co2eKgMonth),
          })}
        </span>
      )}
      {action.impact.costInrMonth > 0 && (
        <span className="impact-chip impact-chip--cost">
          {translate(locale, "impact.saved", { amount: formatInr(action.impact.costInrMonth) })}
        </span>
      )}
      {action.impact.costInrMonth < 0 && (
        <span className="impact-chip impact-chip--cost">
          {translate(locale, "impact.cost", { amount: formatInr(action.impact.costInrMonth) })}
        </span>
      )}
    </div>
  );
}

function ActionItem({
  action,
  top,
  index,
  done,
  onToggle,
  locale,
}: {
  action: PlanAction;
  top: boolean;
  index: number;
  done: boolean;
  onToggle: () => void;
  locale: "en" | "hi";
}) {
  return (
    <li className={`timeline-item ${top ? "is-top" : ""} ${done ? "is-done" : ""}`}>
      <div className="timeline-marker" aria-hidden="true">
        <span className={`timeline-dot category-${action.category}`} />
      </div>
      <details className="action-detail" open={index === 0}>
        <summary>
          <div className="action-summary-row">
            <DoneToggle checked={done} onChange={onToggle} />
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
                {top && <span className="start-here">{translate(locale, "playbook.startHere")}</span>}
                {done && <span className="done-label">{translate(locale, "playbook.done")}</span>}
              </div>
              <h3>{action.title}</h3>
              <p>{action.summary}</p>
              <ImpactChips action={action} locale={locale} />
            </div>
          </div>
          <span className="detail-chevron" aria-hidden="true">
            <Icon name="chevron" size={18} />
          </span>
        </summary>
        <div className="action-expanded">
          <div className="action-steps">
            <span className="micro-label">{translate(locale, "playbook.doThis")}</span>
            <ol>
              {action.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <ListenButton
              text={`${action.title}. ${action.summary}. ${action.steps.join(". ")}`}
              locale={locale}
              label={translate(locale, "playbook.doThis")}
            />
            <button
              type="button"
              className="ask-saans"
              onClick={() =>
                askSaans(translate(locale, "playbook.askHelp", { title: action.title }))
              }
            >
              <Icon name="chat" size={13} />
              {translate(locale, "assistant.ask")}
            </button>
          </div>
          <div className="action-why">
            <span className="micro-label">{translate(locale, "playbook.whyWorks")}</span>
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

function WindowCard({ advice, locale }: { advice: Advice; locale: "en" | "hi" }) {
  const best = advice.windows.best;
  const worst = advice.windows.worst;
  return (
    <div className="rail-card windows-card">
      <div className="rail-heading">
        <span className="eyebrow">{translate(locale, "playbook.outdoorClock")}</span>
        <Icon name="sun" size={18} />
      </div>
      <div className="window-row window-row--best">
        <div>
          <span className="window-kicker">{translate(locale, "playbook.cleanest")}</span>
          <strong>{best.label}</strong>
          <small>
            {advice.measurement.scaleLabel} ≈ {formatNumber(best.displayAqi)}
          </small>
        </div>
        <span className={`window-badge verdict-${best.verdict}`}>
          {best.verdict === "good"
            ? translate(locale, "playbook.goOutside")
            : best.verdict === "short"
              ? translate(locale, "playbook.keepShort")
              : translate(locale, "playbook.stayIn")}
        </span>
      </div>
      <p className="window-detail">{best.detail}</p>
      <div className="window-row window-row--worst">
        <div>
          <span className="window-kicker">{translate(locale, "playbook.roughest")}</span>
          <strong>{worst.label}</strong>
          <small>
            {advice.measurement.scaleLabel} ≈ {formatNumber(worst.displayAqi)}
          </small>
        </div>
      </div>
    </div>
  );
}

function LedgerCard({ advice, locale }: { advice: Advice; locale: "en" | "hi" }) {
  const ledger = advice.ledger;
  return (
    <div className="rail-card ledger-card">
      <div className="rail-heading">
        <span className="eyebrow">{translate(locale, "playbook.impact")}</span>
        <Icon name="spark" size={18} />
      </div>
      <div className="ledger-hero">
        <strong>≤{ledger.exposurePct}%</strong>
        <span>{translate(locale, "playbook.exposureHero")}</span>
      </div>
      <div className="ledger-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, ledger.exposurePct)}%` }} />
      </div>
      <dl className="ledger-list">
        <div>
          <dt>{translate(locale, "playbook.carbonAvoided")}</dt>
          <dd>{formatDecimal(ledger.co2eKgMonth)} kg CO₂e / mo</dd>
        </div>
        <div>
          <dt>{translate(locale, "playbook.netCost")}</dt>
          <dd>
            {ledger.costInrMonth >= 0
              ? `${formatInr(ledger.costInrMonth)} ${translate(locale, "ribbon.saved")}`
              : `${formatInr(ledger.costInrMonth)} ${translate(locale, "ribbon.costLabel")}`}
          </dd>
        </div>
        <div>
          <dt>{translate(locale, "playbook.actionsInPlan")}</dt>
          <dd>{ledger.actionsCount}</dd>
        </div>
      </dl>
      <details className="method-note">
        <summary>
          <Icon name="info" size={14} /> {translate(locale, "playbook.howEstimates")}
        </summary>
        <p>{translate(locale, "playbook.estimatesBody")}</p>
      </details>
    </div>
  );
}

export function Playbook({
  profile,
  air,
  advice,
  completed,
  onToggle,
  streak,
  week,
}: {
  profile: Profile;
  air: AirReading;
  advice: Advice;
  completed: string[];
  onToggle: (actionId: string) => void;
  streak: number;
  week: HabitSummary[];
}) {
  const { settings } = usePreferences();
  const locale = settings.locale;
  const groups = sensitiveGroups(profile.household);
  const sourceLabel =
    air.source === "open-meteo"
      ? translate(locale, "playbook.sourceLive")
      : translate(locale, "playbook.sourceSample");
  const doneCount = advice.actions.filter((action) => completed.includes(action.id)).length;
  const percent = advice.actions.length
    ? Math.round((doneCount / advice.actions.length) * 100)
    : 0;
  const listenText = `${advice.headline}. ${advice.summary}. ${advice.actions
    .map((action) => `${action.title}. ${action.summary}`)
    .join(" ")}`;

  return (
    <section id="playbook" className="section playbook-section" aria-labelledby="playbook-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{translate(locale, "playbook.eyebrow")}</span>
          <h2 id="playbook-title">{translate(locale, "playbook.title")}</h2>
        </div>
        <div className="section-heading-side">
          <p className="section-intro">
            {advice.actions.length} {translate(locale, "playbook.intro")}
          </p>
          <div className="heading-tools">
            <HabitRing completed={doneCount} total={advice.actions.length} percent={percent} />
            <ListenButton
              text={listenText}
              locale={locale}
              label={translate(locale, "curve.title")}
            />
          </div>
        </div>
      </div>

      <AirCurve
        hourly={air.hourly}
        standard={settings.aqiStandard}
        bestLabel={advice.windows.best.label}
        worstLabel={advice.windows.worst.label}
      />

      <div className="playbook-layout">
        <ol className="timeline" aria-label={translate(locale, "playbook.timelineLabel")}>
          {advice.actions.map((action, index) => (
            <ActionItem
              key={action.id}
              action={action}
              top={action.id === advice.topAction.id}
              index={index}
              done={completed.includes(action.id)}
              onToggle={() => onToggle(action.id)}
              locale={locale}
            />
          ))}
        </ol>

        <aside className="playbook-rail" aria-label={translate(locale, "assistant.contextLabel")}>
          <div className={`rail-card risk-card risk-${advice.risk}`}>
            <div className="rail-heading">
              <span className="eyebrow">{translate(locale, "playbook.householdRead")}</span>
              <span className="risk-dot" aria-hidden="true" />
            </div>
            <h3>{advice.riskLabel}</h3>
            <p>
              {groups.length > 0
                ? `${translate(locale, "playbook.extraCare")} ${groups.join(", ")}.`
                : translate(locale, "playbook.broad")}
            </p>
            {advice.alert && <div className="alert-note">{advice.alert}</div>}
          </div>

          <GrapNotice grap={advice.grap} />
          <WindowCard advice={advice} locale={locale} />
          <AtmosphereCard atmosphere={advice.atmosphere} />
          <HabitCard streak={streak} week={week} />
          <LedgerCard advice={advice} locale={locale} />

          <div className="rail-card source-card">
            <span className="eyebrow">{translate(locale, "playbook.behindReading")}</span>
            <p>
              <strong>{sourceLabel}</strong> · {formatObservedAt(air.observedAt)}
            </p>
            <p className="source-detail">
              PM2.5 {formatDecimal(air.pm25)} µg/m³ · PM10 {formatDecimal(air.pm10)} µg/m³
            </p>
            <details className="method-note">
              <summary>
                <Icon name="info" size={14} /> {translate(locale, "playbook.aboutNumbers")}
              </summary>
              <p>{translate(locale, "playbook.aboutNumbersBody")}</p>
            </details>
          </div>
        </aside>
      </div>
    </section>
  );
}
