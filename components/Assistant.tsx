"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanAnswerText } from "@/lib/ai";
import { onAskSaans } from "@/lib/ask";
import { buildLocalAnswer, localSuggestions } from "@/lib/assistant";
import { sensitiveGroups } from "@/lib/aqi";
import { formatNumber } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { canListen, listenOnce } from "@/lib/speech";
import type { Advice, AirReading, ChatMessage, ChatStreamEvent, Profile } from "@/lib/types";
import { Icon } from "./Icon";
import { ListenButton } from "./ListenButton";
import { usePreferences } from "./PreferencesProvider";

function messageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function greeting(profile: Profile, air: AirReading, advice: Advice): ChatMessage {
  const groups = sensitiveGroups(profile.household);
  return {
    id: "welcome",
    role: "assistant",
    content: `I have ${profile.city.name}'s current reading and your household context.\n\n${advice.measurement.scaleLabel} is ${advice.measurement.value} (${advice.measurement.label}). Today's priority is “${advice.topAction.title}”.\n\nAsk me anything practical — the school run, a purifier, cooking smoke, your commute or how to involve neighbours.${groups.length ? ` I'll keep extra care for ${groups.join(", ")} in view.` : ""}`,
    mode: "local",
    createdAt: new Date().toISOString(),
  };
}

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
  const welcome = useMemo(() => greeting(profile, air, advice), [profile, air, advice]);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [chips, setChips] = useState<string[]>(() => localSuggestions(profile));
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const groups = sensitiveGroups(profile.household);

  useEffect(() => {
    setMessages([welcome]);
  }, [welcome]);

  useEffect(() => {
    setChips(localSuggestions(profile));
  }, [profile]);

  useEffect(() => {
    setSpeechReady(canListen());
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("chat-open");
      // Focusing on a touch device pops the keyboard immediately and shifts the
      // drawer before the user has read anything.
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
    // Clearing the pending question inside the timer (not before it) keeps the
    // effect from tearing down its own timeout on the resulting re-render.
    const timer = window.setTimeout(() => {
      setPendingQuestion(null);
      void ask(question);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, pendingQuestion]);

  useEffect(() => {
    if (!open) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [messages, loading, open]);

  async function ask(rawQuestion: string) {
    const question = rawQuestion.trim().slice(0, 600);
    if (!question || loading) return;

    const userMessage: ChatMessage = {
      id: messageId(),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    const history = messages.slice(-6);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setNote("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history,
          profile,
          air,
          locale,
          standard: settings.aqiStandard,
        }),
        signal: AbortSignal.timeout(22_000),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "The assistant could not answer just now.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("The assistant could not answer just now.");

      const answerId = messageId();
      let appended = false;
      let buffer = "";
      let mode: "ai" | "local" = "local";
      let streamNote = "";

      const paint = (text: string, nextMode: "ai" | "local") => {
        mode = nextMode;
        if (!appended) {
          appended = true;
          setMessages((current) => [
            ...current,
            {
              id: answerId,
              role: "assistant",
              content: text,
              mode: nextMode,
              createdAt: new Date().toISOString(),
            },
          ]);
          return;
        }
        setMessages((current) =>
          current.map((item) =>
            item.id === answerId ? { ...item, content: text, mode: nextMode } : item,
          ),
        );
      };

      const handle = (event: ChatStreamEvent) => {
        if (event.type === "delta" && event.text) {
          buffer += event.text;
          paint(cleanAnswerText(buffer), "ai");
        } else if (event.type === "replace" && typeof event.text === "string") {
          buffer = event.text;
          paint(event.text, event.mode ?? mode);
        } else if (event.type === "done") {
          mode = event.mode ?? mode;
          if (event.suggestions?.length) setChips(event.suggestions);
          if (event.note) streamNote = event.note;
          if (buffer) paint(buffer, mode);
        }
      };

      const decoder = new TextDecoder();
      let raw = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const lines = raw.split("\n");
        raw = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handle(JSON.parse(line) as ChatStreamEvent);
          } catch {
            // Ignore a malformed frame rather than dropping the whole answer.
          }
        }
      }

      if (!appended) throw new Error("The assistant could not answer just now.");
      setNote(streamNote);
    } catch (caught) {
      const fallback = buildLocalAnswer(question, profile, air, advice);
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: fallback.answer,
          mode: "local",
          createdAt: new Date().toISOString(),
        },
      ]);
      setChips(fallback.suggestions);
      setNote("");
      setError(
        caught instanceof Error && caught.message.includes("short break")
          ? caught.message
          : "The live assistant was unavailable, so this answer used Saans's offline household logic.",
      );
    } finally {
      setLoading(false);
      if (!window.matchMedia("(hover: none)").matches) inputRef.current?.focus();
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(input);
    }
  }

  function startListening() {
    if (listening) return;
    setListening(true);
    const started = listenOnce(
      locale,
      (text) => {
        setInput((current) => (current ? `${current} ${text}` : text).slice(0, 600));
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
            {advice.measurement.scaleLabel} {formatNumber(advice.measurement.value)} · {profile.city.name}
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
        <div
          className="drawer-shell"
          onClick={(event) => event.stopPropagation()}
        >
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
                  setMessages([welcome]);
                  setChips(localSuggestions(profile));
                  setError("");
                  setNote("");
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

          <div className="drawer-context" aria-label="Today's context">
            <span className="drawer-context-chip">
              <Icon name="shield" size={13} />
              {profile.household.adults + profile.household.children + profile.household.elders} people
            </span>
            {groups.length > 0 && (
              <span className="drawer-context-chip drawer-context-chip--warm">
                <Icon name="users" size={13} />
                sensitive care
              </span>
            )}
            <span className="drawer-context-chip">
              <Icon name="sun" size={13} />
              clean {advice.windows.best.label}
            </span>
            <span className="drawer-context-chip">
              <Icon name="wind" size={13} />
              rough {advice.windows.worst.label}
            </span>
          </div>

          <div
            className="chat-log"
            ref={logRef}
            role="log"
            aria-label="Conversation with Saans"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`chat-message chat-message--${message.role}`}
                aria-label={message.role === "assistant" ? "Saans" : "You"}
              >
                {message.role === "assistant" && (
                  <span className="message-mark" aria-hidden="true">
                    <Icon name="spark" size={14} />
                  </span>
                )}
                <div className="message-body">
                  <p>{message.content}</p>
                  {message.role === "assistant" && (
                    <div className="message-tools">
                      <ListenButton
                        text={message.content}
                        locale={locale}
                        label={translate(locale, "curve.title")}
                      />
                      {message.id !== "welcome" && (
                        <span className="message-mode">
                          {message.mode === "ai"
                            ? translate(locale, "assistant.ai")
                            : translate(locale, "assistant.local")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="chat-thinking" role="status">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span>{translate(locale, "assistant.thinking")}</span>
              </div>
            )}
          </div>

          <div className="chat-suggestions" aria-label="Suggested questions">
            {chips.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => void ask(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="chat-input">
              Ask the Saans assistant a question
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              maxLength={600}
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
                aria-label="Speak your question"
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
              {input.length > 0 ? `${input.length}/600` : translate(locale, "assistant.notMedical")}
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
