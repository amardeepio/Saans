"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildLocalAnswer, localSuggestions } from "@/lib/assistant";
import { sensitiveGroups } from "@/lib/aqi";
import { formatNumber } from "@/lib/format";
import type { Advice, AirReading, ChatMessage, ChatResponse, Profile } from "@/lib/types";
import { Icon } from "./Icon";

function messageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function greeting(profile: Profile, air: AirReading, advice: Advice): ChatMessage {
  const groups = sensitiveGroups(profile.household);
  return {
    id: "welcome",
    role: "assistant",
    content: `I have ${profile.city.name}'s current reading and your household context.\n\nAQI is ${air.aqi} (${air.categoryLabel}). Today's priority is “${advice.topAction.title}”.\n\nAsk me anything practical — the school run, a purifier, cooking smoke, your commute or how to involve neighbours.${groups.length ? ` I'll keep extra care for ${groups.join(", ")} in view.` : ""}`,
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
  const welcome = useMemo(() => greeting(profile, air, advice), [profile, air, advice]);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = useMemo(() => localSuggestions(profile), [profile]);
  const groups = sensitiveGroups(profile.household);

  useEffect(() => {
    setMessages([welcome]);
  }, [welcome]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("chat-open");
      window.setTimeout(() => inputRef.current?.focus(), 120);
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.classList.remove("chat-open");
    }

    return () => {
      document.body.classList.remove("chat-open");
    };
  }, [open]);

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
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history, profile, air }),
        signal: AbortSignal.timeout(22_000),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "The assistant could not answer just now.");
      }
      const data = (await response.json()) as ChatResponse;
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: data.answer,
          mode: data.mode,
          createdAt: new Date().toISOString(),
        },
      ]);
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
      setError(
        caught instanceof Error && caught.message.includes("short break")
          ? caught.message
          : "The live assistant was unavailable, so this answer used Saans's offline household logic.",
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
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
          <strong>Ask Saans</strong>
          <small>AQI {formatNumber(air.aqi)} · {profile.city.name}</small>
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
                <span className="eyebrow eyebrow--light">Ask Saans</span>
                <h2 id="assistant-drawer-title">Your air assistant</h2>
                <p id="assistant-drawer-desc">
                  {profile.city.name} · AQI {formatNumber(air.aqi)} · {air.categoryLabel}
                </p>
              </div>
            </div>
            <div className="drawer-header-actions">
              <button
                type="button"
                className="drawer-reset"
                onClick={() => {
                  setMessages([welcome]);
                  setError("");
                  inputRef.current?.focus();
                }}
                disabled={messages.length <= 1}
              >
                New chat
              </button>
              <button type="button" className="drawer-close" onClick={close} aria-label="Close assistant">
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
                  {message.role === "assistant" && message.id !== "welcome" && (
                    <span className="message-mode">
                      {message.mode === "ai" ? "GenAI · grounded in your context" : "Household logic · offline-safe"}
                    </span>
                  )}
                </div>
              </article>
            ))}
            {loading && (
              <div className="chat-thinking" role="status">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span>Reading your context…</span>
              </div>
            )}
          </div>

          <div className="chat-suggestions" aria-label="Suggested questions">
            {suggestions.map((suggestion) => (
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
              placeholder="Ask about the school run, purifiers, cooking smoke…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send"
              aria-label="Send question"
              disabled={loading || input.trim().length === 0}
            >
              <Icon name="arrow" size={19} />
            </button>
          </form>
          <div className="chat-footnote">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span>{input.length > 0 ? `${input.length}/600` : "Not medical advice"}</span>
          </div>
          {error && (
            <p className="chat-error" role="status">
              {error}
            </p>
          )}
          <p className="drawer-privacy">
            <Icon name="shield" size={13} />
            Your profile stays in this browser. No account, no chat history on our servers.
          </p>
        </div>
      </dialog>
    </>
  );
}
