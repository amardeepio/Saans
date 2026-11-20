"use client";

import { useEffect, useRef, useState } from "react";
import { buildIcs, cleanWindowEvent, downloadIcs } from "@/lib/calendar";
import { requestNotificationPermission } from "@/lib/alerts";
import { translate } from "@/lib/i18n";
import { LOCALE_LABELS } from "@/lib/i18n";
import type { Advice, Locale } from "@/lib/types";
import { AqiScaleToggle } from "./AqiScaleToggle";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

export function SettingsDialog({
  open,
  onOpenChange,
  advice,
  city,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advice: Advice | null;
  city: string;
}) {
  const { settings, setLocale, setSimpleMode, updateAlerts } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => closeRef.current?.focus(), 80);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function close() {
    if (dialogRef.current?.open) dialogRef.current.close();
    onOpenChange(false);
  }

  async function enableAlerts(checked: boolean) {
    if (!checked) {
      updateAlerts({ enabled: false });
      setStatus("");
      return;
    }
    const permission = await requestNotificationPermission();
    updateAlerts({ enabled: true });
    setStatus(
      permission === "granted"
        ? translate(settings.locale, "alert.enabled")
        : translate(settings.locale, "alert.denied"),
    );
  }

  function addCalendar() {
    if (!advice) return;
    const content = buildIcs(
      cleanWindowEvent({
        city,
        label: advice.windows.best.label,
        start: advice.windows.best.start,
        end: advice.windows.best.end,
        aqi: advice.windows.best.displayAqi,
        scale: advice.measurement.scaleLabel,
      }),
    );
    if (!content) {
      setStatus("This reading does not include a usable date.");
      return;
    }
    downloadIcs("saans-clean-window.ics", content);
    setStatus(translate(settings.locale, "alert.calendarDone"));
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
    >
      <div className="settings-shell" onClick={(event) => event.stopPropagation()}>
        <header className="settings-head">
          <div>
            <span className="eyebrow">{translate(settings.locale, "settings.title")}</span>
            <h2 id="settings-title">{translate(settings.locale, "settings.title")}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            onClick={close}
            aria-label={translate(settings.locale, "settings.close")}
          >
            <Icon name="close" size={19} />
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-group">
            <h3>{translate(settings.locale, "settings.scale")}</h3>
            <AqiScaleToggle />
            <p className="settings-note">
              {settings.aqiStandard === "naqi"
                ? "Indian NAQI is estimated from the current pollutant mix, including a dominant-pollutant read."
                : "US AQI follows the EPA scale and is the provider's native reading."}
            </p>
          </section>

          <section className="settings-group">
            <h3>{translate(settings.locale, "settings.language")}</h3>
            <div className="settings-choices">
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  className={`choice-pill ${settings.locale === locale ? "is-selected" : ""}`}
                  aria-pressed={settings.locale === locale}
                  onClick={() => setLocale(locale)}
                >
                  {LOCALE_LABELS[locale]}
                </button>
              ))}
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.simpleMode}
                onChange={(event) => setSimpleMode(event.target.checked)}
              />
              <span>{translate(settings.locale, "settings.simple")}</span>
            </label>
          </section>

          <section className="settings-group">
            <h3>{translate(settings.locale, "settings.alerts")}</h3>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.alerts.enabled}
                onChange={(event) => void enableAlerts(event.target.checked)}
              />
              <span>
                {settings.alerts.enabled
                  ? translate(settings.locale, "settings.alertsOn")
                  : translate(settings.locale, "settings.alertsOff")}
              </span>
            </label>

            <label className="settings-field">
              <span>{translate(settings.locale, "settings.threshold")}</span>
              <strong>{settings.alerts.threshold}</strong>
              <input
                type="range"
                min={50}
                max={400}
                step={25}
                value={settings.alerts.threshold}
                onChange={(event) => updateAlerts({ threshold: Number(event.target.value) })}
              />
            </label>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.alerts.cleanWindow}
                onChange={(event) => updateAlerts({ cleanWindow: event.target.checked })}
              />
              <span>{translate(settings.locale, "settings.calendar")}</span>
            </label>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.alerts.schoolRun}
                onChange={(event) => updateAlerts({ schoolRun: event.target.checked })}
              />
              <span>{translate(settings.locale, "setup.schoolRun")}</span>
            </label>

            <div className="settings-times">
              <label>
                <span>{translate(settings.locale, "settings.quiet")}</span>
                <input
                  type="time"
                  value={settings.alerts.quietStart}
                  onChange={(event) => updateAlerts({ quietStart: event.target.value })}
                />
              </label>
              <label>
                <span>&nbsp;</span>
                <input
                  type="time"
                  value={settings.alerts.quietEnd}
                  onChange={(event) => updateAlerts({ quietEnd: event.target.value })}
                />
              </label>
            </div>

            <button
              type="button"
              className="button button--quiet button--small"
              onClick={addCalendar}
              disabled={!advice}
            >
              <Icon name="calendar" size={15} />
              {translate(settings.locale, "settings.calendar")}
            </button>
            <p className="settings-note">
              {translate(settings.locale, "settings.pushUnavailable")}
            </p>
          </section>

          {status && (
            <p className="settings-status" role="status" aria-live="polite">
              {status}
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
