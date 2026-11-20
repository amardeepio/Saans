import type { Locale } from "./types";

const SPEECH_LOCALE: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

export function speechLocale(locale: Locale): string {
  return SPEECH_LOCALE[locale] ?? "en-IN";
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, locale: Locale): boolean {
  if (!canSpeak() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 4_000));
    utterance.lang = speechLocale(locale);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionConstructor() !== null;
}

export function listenOnce(
  locale: Locale,
  onResult: (text: string) => void,
  onEnd?: () => void,
): boolean {
  const Recognition = recognitionConstructor();
  if (!Recognition) return false;
  try {
    const recognition = new Recognition();
    recognition.lang = speechLocale(locale);
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) onResult(transcript);
    };
    recognition.onerror = () => onEnd?.();
    recognition.onend = () => onEnd?.();
    recognition.start();
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}
