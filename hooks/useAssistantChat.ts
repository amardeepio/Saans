"use client";

import { useCallback, useMemo, useState } from "react";
import { cleanAnswerText } from "@/lib/ai";
import { sensitiveGroups } from "@/lib/aqi";
import { buildLocalAnswer, localSuggestions } from "@/lib/assistant";
import type {
  Advice,
  AirReading,
  AqiStandard,
  ChatMessage,
  ChatStreamEvent,
  Locale,
  Profile,
} from "@/lib/types";

function messageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function greeting(profile: Profile, advice: Advice): ChatMessage {
  const groups = sensitiveGroups(profile.household);
  return {
    id: "welcome",
    role: "assistant",
    content: `I have ${profile.city.name}'s current reading and your household context.\n\n${advice.measurement.scaleLabel} is ${advice.measurement.value} (${advice.measurement.label}). Today's priority is “${advice.topAction.title}”.\n\nAsk me anything practical — the school run, a purifier, cooking smoke, your commute or how to involve neighbours.${groups.length ? ` I'll keep extra care for ${groups.join(", ")} in view.` : ""}`,
    mode: "local",
    createdAt: new Date().toISOString(),
  };
}

interface UseAssistantChatOptions {
  profile: Profile;
  air: AirReading;
  advice: Advice;
  locale: Locale;
  aqiStandard: AqiStandard;
  onFinished?: () => void;
}

interface ConversationState {
  welcomeKey: string;
  messages: ChatMessage[];
  chips: string[];
}

export function useAssistantChat({
  profile,
  air,
  advice,
  locale,
  aqiStandard,
  onFinished,
}: UseAssistantChatOptions) {
  const welcome = useMemo(() => greeting(profile, advice), [profile, advice]);
  const defaultChips = useMemo(() => localSuggestions(profile), [profile]);
  const [conversation, setConversation] = useState<ConversationState>(() => ({
    welcomeKey: welcome.content,
    messages: [welcome],
    chips: defaultChips,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const isCurrent = conversation.welcomeKey === welcome.content;
  const messages = useMemo(
    () => (isCurrent ? conversation.messages : [welcome]),
    [isCurrent, conversation.messages, welcome],
  );
  const chips = isCurrent ? conversation.chips : defaultChips;

  const setMessages = useCallback(
    (updater: (current: ChatMessage[]) => ChatMessage[]) => {
      setConversation((prev) => {
        const baseMessages = prev.welcomeKey === welcome.content ? prev.messages : [welcome];
        const baseChips = prev.welcomeKey === welcome.content ? prev.chips : defaultChips;
        return {
          welcomeKey: welcome.content,
          messages: updater(baseMessages),
          chips: baseChips,
        };
      });
    },
    [welcome, defaultChips],
  );

  const setChips = useCallback(
    (nextChips: string[]) => {
      setConversation((prev) => ({
        welcomeKey: welcome.content,
        messages: prev.welcomeKey === welcome.content ? prev.messages : [welcome],
        chips: nextChips,
      }));
    },
    [welcome],
  );

  const reset = useCallback(() => {
    setConversation({
      welcomeKey: welcome.content,
      messages: [welcome],
      chips: defaultChips,
    });
    setError("");
    setNote("");
  }, [welcome, defaultChips]);

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim().slice(0, 600);
      if (!question || loading) return false;

      const userMessage: ChatMessage = {
        id: messageId(),
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
      };
      const history = messages.slice(-6);
      setMessages((current) => [...current, userMessage]);
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
            standard: aqiStandard,
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
        onFinished?.();
      }
      return true;
    },
    [loading, messages, profile, air, advice, locale, aqiStandard, onFinished, setMessages, setChips],
  );

  return { messages, chips, loading, error, note, ask, reset };
}
