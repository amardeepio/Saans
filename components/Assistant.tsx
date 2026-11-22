"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import { useClientValue } from "@/hooks/useClientValue";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { onAskSaans } from "@/lib/ask";
import { sensitiveGroups } from "@/lib/aqi";
import { CHAT_INPUT_MAX } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { canListen, listenOnce } from "@/lib/speech";
import type { Advice, AirReading, Profile } from "@/lib/types";
import { ChatLog } from "./assistant/ChatLog";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

interface AssistantProps {
  profile: Profile;
  air: AirReading;
  advice: Advice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Assistant({ profile, air, advice, open, onOpenChange }: AssistantProps) {
  const { settings } = usePreferences();
  const locale = settings.locale;
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const speechReady = useClientValue(canListen, false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const groups = sensitiveGroups(profile.household);

  const focusInputIfDesktop = useCallback(() => {
    if (!window.matchMedia("(hover: none)").matches) inputRef.current?.focus();
  }, []);

  const { messages, chips, loading, error, note, ask, reset } = useAssistantChat({
    profile,
    air,
    advice,
    locale,
    aqiStandard: settings.aqiStandard,
    onFinished: focusInputIfDesktop,
  });

  useDialogFocus(open, dialogRef);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("chat-open");
      const touch = window.matchMedia("(hover: none)").matches;
      if (!touch) window.setTimeout(() => inputRef.current?.focus(), 120);
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.classList.remove("chat-open");
    }

    return () => {
      document.body.classList.remove("chat-open");
    };
  }, [open]);

  // Safari does not shrink `dvh` when the soft keyboard opens, so track the
  // visual viewport and size the drawer from it.
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement.style;
    const apply = () => {
      root.setProperty("--chat-vh", `${Math.round(viewport.height)}px`);
      root.setProperty("--chat-vtop", `${Math.round(viewport.offsetTop)}px`);
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
      root.removeProperty("--chat-vh");
      root.removeProperty("--chat-vtop");
    };
  }, [open]);

  // "Ask about this" hooks anywhere in the app open the drawer pre-filled.
  useEffect(
    () =>
      onAskSaans((question) => {
        setPendingQuestion(question);
        onOpenChange(true);
      }),
    [onOpenChange],
  );

  useEffect(() => {
    if (!open || !pendingQuestion) return;
    const question = pendingQuestion;
    const timer = window.setTimeout(() => {
      setPendingQuestion(null);
      void ask(question);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, pendingQuestion, ask]);

  useEffect(() => {
    if (!open) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [messages, loading, open]);

  async function sendQuestion(rawQuestion: string) {
    const sent = await ask(rawQuestion);
    if (sent) setInput("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void sendQuestion(input);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(input);
    }
  }

  function startListening() {
    if (listening) return;
    setListening(true);
    const started = listenOnce(
      locale,
      (text) => {
        setInput((current) =>
          (current ? `${current} ${text}` : text).slice(0, CHAT_INPUT_MAX),
        );
        inputRef.current?.focus();
      },
      () => setListening(false),
    );
    if (!started) setListening(false);
  }

  function close() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onOpenChange(false);
    window.setTimeout(() => fabRef.current?.focus(), 140);
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="chat-fab"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="saans-chat-dialog"
      >
        <span className="chat-fab-icon" aria-hidden="true">
          <Icon name="chat" size={20} />
        </span>
        <span className="chat-fab-copy">
          <strong>{translate(locale, "assistant.ask")}</strong>
          <small>
            {advice.measurement.scaleLabel} {formatNumber(advice.measurement.value)} ·{" "}
            {profile.city.name}
          </small>
        </span>
        <span className="chat-fab-live" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        id="saans-chat-dialog"
        className="assistant-drawer"
        aria-labelledby="assistant-drawer-title"
        aria-describedby="assistant-drawer-desc"
        onClose={() => {
          document.body.classList.remove("chat-open");
          onOpenChange(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="drawer-shell" onClick={(event) => event.stopPropagation()}>
          <header className="drawer-header">
            <div className="drawer-identity">
              <span className="chat-avatar" aria-hidden="true">
                <Icon name="spark" size={18} />
              </span>
              <div>
                <span className="eyebrow eyebrow--light">{translate(locale, "assistant.ask")}</span>
                <h2 id="assistant-drawer-title">{translate(locale, "assistant.title")}</h2>
                <p id="assistant-drawer-desc">
                  {profile.city.name} · {advice.measurement.scaleLabel}{" "}
                  {formatNumber(advice.measurement.value)} · {advice.measurement.label}
                </p>
              </div>
            </div>
            <div className="drawer-header-actions">
              <button
                type="button"
                className="drawer-reset"
                onClick={() => {
                  reset();
                  inputRef.current?.focus();
                }}
                disabled={messages.length <= 1}
              >
                {translate(locale, "assistant.newChat")}
              </button>
              <button
                type="button"
                className="drawer-close"
                onClick={close}
                aria-label={translate(locale, "assistant.close")}
              >
                <Icon name="close" size={19} />
              </button>
            </div>
          </header>

          <div className="drawer-context" aria-label={translate(locale, "assistant.contextLabel")}>
            <span className="drawer-context-chip">
              <Icon name="shield" size={13} />
              {translate(locale, "assistant.people", {
                count:
                  profile.household.adults +
                  profile.household.children +
                  profile.household.elders,
              })}
            </span>
            {groups.length > 0 && (
              <span className="drawer-context-chip drawer-context-chip--warm">
                <Icon name="users" size={13} />
                {translate(locale, "assistant.sensitiveCare")}
              </span>
            )}
            <span className="drawer-context-chip">
              <Icon name="sun" size={13} />
              {translate(locale, "assistant.cleanWindow", { window: advice.windows.best.label })}
            </span>
            <span className="drawer-context-chip">
              <Icon name="wind" size={13} />
              {translate(locale, "assistant.roughWindow", { window: advice.windows.worst.label })}
            </span>
          </div>

          <ChatLog logRef={logRef} messages={messages} loading={loading} locale={locale} />

          <div
            className="chat-suggestions"
            aria-label={translate(locale, "assistant.suggestionsLabel")}
          >
            {chips.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => void sendQuestion(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="chat-input">
              {translate(locale, "assistant.inputLabel")}
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              maxLength={CHAT_INPUT_MAX}
              placeholder={translate(locale, "assistant.placeholder")}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            {speechReady && (
              <button
                type="button"
                className={`chat-mic ${listening ? "is-listening" : ""}`}
                aria-label={translate(locale, "assistant.micLabel")}
                aria-pressed={listening}
                onClick={startListening}
                disabled={loading}
              >
                <Icon name="mic" size={18} />
              </button>
            )}
            <button
              type="submit"
              className="chat-send"
              aria-label={translate(locale, "assistant.send")}
              disabled={loading || input.trim().length === 0}
            >
              <Icon name="arrow" size={19} />
            </button>
          </form>
          <div className="chat-footnote">
            <span>{translate(locale, "assistant.enter")}</span>
            <span>
              {input.length > 0
                ? `${input.length}/${CHAT_INPUT_MAX}`
                : translate(locale, "assistant.notMedical")}
            </span>
          </div>
          {note && (
            <p className="chat-note" role="status">
              <Icon name="info" size={13} /> {note}
            </p>
          )}
          {error && (
            <p className="chat-error" role="status">
              {error}
            </p>
          )}
          <p className="drawer-privacy">
            <Icon name="shield" size={13} />
            {translate(locale, "assistant.privacy")}
          </p>
        </div>
      </dialog>
    </>
  );
}
