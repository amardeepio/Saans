"use client";

import { useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icon";

export function ListenButton({
  text,
  locale,
  label = "Listen",
}: {
  text: string;
  locale: Locale;
  label?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const supported = useClientValue(canSpeak, false);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const started = speak(text, locale);
    setSpeaking(started);
    if (!started) return;
    window.setTimeout(() => setSpeaking(false), Math.min(60_000, text.length * 80));
  }

  return (
    <button
      type="button"
      className={`listen-button ${speaking ? "is-speaking" : ""}`}
      onClick={toggle}
      aria-pressed={speaking}
    >
      <Icon name="speaker" size={15} />
      {speaking ? "Stop" : label}
    </button>
  );
}
