"use client";

import type { RefObject } from "react";
import { translate } from "@/lib/i18n";
import type { ChatMessage, Locale } from "@/lib/types";
import { Icon } from "../Icon";
import { ListenButton } from "../ListenButton";

interface ChatLogProps {
  logRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  loading: boolean;
  locale: Locale;
}

export function ChatLog({ logRef, messages, loading, locale }: ChatLogProps) {
  return (
    <div
      className="chat-log"
      ref={logRef}
      role="log"
      aria-label={translate(locale, "chat.conversation")}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {messages.map((message) => (
        <article
          key={message.id}
          className={`chat-message chat-message--${message.role}`}
          aria-label={
            message.role === "assistant"
              ? translate(locale, "chat.assistantName")
              : translate(locale, "chat.you")
          }
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
  );
}
