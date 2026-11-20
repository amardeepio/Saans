import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canListen,
  canSpeak,
  listenOnce,
  speak,
  speechLocale,
  stopSpeaking,
} from "@/lib/speech";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("speech helpers", () => {
  it("maps locales to BCP-47 speech tags", () => {
    expect(speechLocale("en")).toBe("en-IN");
    expect(speechLocale("hi")).toBe("hi-IN");
  });

  it("degrades safely outside a browser", () => {
    expect(canSpeak()).toBe(false);
    expect(canListen()).toBe(false);
    expect(speak("hello", "en")).toBe(false);
    expect(() => stopSpeaking()).not.toThrow();
  });

  it("speaks through the browser speech synthesiser", () => {
    const speakMock = vi.fn();
    const cancel = vi.fn();
    const windowMock = {
      speechSynthesis: { speak: speakMock, cancel },
    };
    vi.stubGlobal("window", windowMock);
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        lang = "";
        rate = 1;
        constructor(public text: string) {}
      },
    );

    expect(canSpeak()).toBe(true);
    expect(speak("hello", "hi")).toBe(true);
    expect(speakMock).toHaveBeenCalledTimes(1);
    stopSpeaking();
    expect(cancel).toHaveBeenCalled();
  });

  it("captures a single spoken question", () => {
    class Recognition {
      static last: Recognition | null = null;
      lang = "";
      interimResults = false;
      continuous = false;
      onresult:
        | ((event: {
            results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
          }) => void)
        | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;

      constructor() {
        Recognition.last = this;
      }

      start() {
        Recognition.last?.onresult?.({
          results: [{ isFinal: true, 0: { transcript: "स्कूल कब जाएं" } }],
        });
      }

      stop = vi.fn();
    }
    vi.stubGlobal("window", { SpeechRecognition: Recognition });
    vi.stubGlobal("SpeechRecognition", Recognition);

    const onResult = vi.fn();
    const onEnd = vi.fn();
    expect(canListen()).toBe(true);
    expect(listenOnce("hi", onResult, onEnd)).toBe(true);
    expect(onResult).toHaveBeenCalledWith("स्कूल कब जाएं");
  });
});
