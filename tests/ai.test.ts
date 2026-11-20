import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askGenAi, cleanAnswerText, isGenAiConfigured, streamGenAi } from "@/lib/ai";
import { DEFAULT_PROFILE } from "@/lib/cities";
import { buildAdvice } from "@/lib/engine";
import { sampleReading } from "@/lib/sample-air";

const AIR = sampleReading(DEFAULT_PROFILE.city, new Date("2026-01-12T08:00:00.000Z"));
const ADVICE = buildAdvice(DEFAULT_PROFILE, AIR);
const ORIGINAL_ENV = { ...process.env };

function completion(content: string): Response {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

describe("optional GenAI layer", () => {
  beforeEach(() => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_BASE_URL = "https://example.com/v1";
    process.env.AI_MODEL = "test-model";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports whether the provider is configured", () => {
    expect(isGenAiConfigured()).toBe(true);
    delete process.env.AI_API_KEY;
    delete process.env.GROQ_API_KEY;
    expect(isGenAiConfigured()).toBe(false);
  });

  it("returns a usable answer and removes display markdown", async () => {
    const fetchMock = vi.fn(async () =>
      completion("**Do this**\n- Run the purifier\n- Keep windows closed.\n\nRest is useful too."),
    );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await askGenAi(
      "How do I clean the bedroom?",
      [],
      DEFAULT_PROFILE,
      AIR,
      ADVICE,
    );

    expect(answer).toContain("Do this");
    expect(answer).not.toContain("**");
    expect(answer).toContain("• Run the purifier");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("https://example.com/v1/chat/completions");
    expect(String(init.body)).not.toContain("test-key");
  });

  it("rejects advice to open windows during dirty air", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion("Open the windows for ten minutes to refresh the room and let the smog out.")),
    );

    const answer = await askGenAi("Should I open windows?", [], DEFAULT_PROFILE, AIR, ADVICE);
    expect(answer).toBeNull();
  });

  it("allows window advice when the air is genuinely clean", async () => {
    const cleanAir = { ...AIR, aqi: 42 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => completion("Open the windows for ten minutes to refresh the room when the outdoor air is this clean.")),
    );

    const answer = await askGenAi("Should I open windows?", [], DEFAULT_PROFILE, cleanAir, ADVICE);
    expect(answer).not.toBeNull();
  });

  it("rejects a two-wheeler school run for a child in heavy smog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        completion("Take the child to school on a scooter to shorten the trip. It is the fastest option."),
      ),
    );

    const answer = await askGenAi("Best school run?", [], DEFAULT_PROFILE, AIR, ADVICE);
    expect(answer).toBeNull();
  });

  it("falls back cleanly when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    const answer = await askGenAi("Should I open windows?", [], DEFAULT_PROFILE, AIR, ADVICE);
    expect(answer).toBeNull();
  });

  it("does not call a provider without a key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    delete process.env.AI_API_KEY;
    delete process.env.GROQ_API_KEY;

    const answer = await askGenAi("Hello", [], DEFAULT_PROFILE, AIR, ADVICE);
    expect(answer).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips markdown markers that arrive split across chunks", () => {
    expect(cleanAnswerText("**Bold text**")).toBe("Bold text");
    expect(cleanAnswerText("Bold text **")).toBe("Bold text");
    expect(cleanAnswerText("- one\n- two")).toBe("• one\n• two");
    expect(cleanAnswerText("Plain answer, no markup.")).toBe("Plain answer, no markup.");
  });

  it("streams deltas from a server-sent-events response", async () => {
    const frames = [
      'data: {"choices":[{"delta":{"content":"Keep "}}]}\n',
      'data: {"choices":[{"delta":{"content":"windows "}}]}\n',
      'data: {"choices":[{"delta":{"content":"closed."}}]}\n',
      "data: [DONE]\n",
    ];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, body }) as unknown as Response));

    const parts: string[] = [];
    for await (const delta of streamGenAi("q", [], DEFAULT_PROFILE, AIR, ADVICE)) {
      parts.push(delta);
    }

    expect(parts.join("")).toBe("Keep windows closed.");
    expect(fetchMockBody(vi.mocked(fetch).mock.calls[0])).toContain('"stream":true');
  });
});

function fetchMockBody(call: unknown[]): string {
  const init = call[1] as RequestInit | undefined;
  return String(init?.body ?? "");
}
