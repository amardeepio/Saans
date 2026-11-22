import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchJson,
  HttpError,
  isAbortError,
  requestSignal,
} from "@/lib/client-fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("client fetch helper", () => {
  it("parses a successful JSON response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson<{ ok: boolean }>("/api/test")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/test", expect.objectContaining({}));
  });

  it("throws a typed error for non-2xx responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));

    await expect(fetchJson("/api/test")).rejects.toBeInstanceOf(HttpError);
    await expect(fetchJson("/api/test")).rejects.toMatchObject({ status: 503 });
  });

  it("merges a caller signal with the timeout signal", () => {
    const controller = new AbortController();
    const signal = requestSignal(controller.signal, 5_000);
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("recognises abort errors", () => {
    const controller = new AbortController();
    controller.abort();
    expect(isAbortError(controller.signal.reason)).toBe(true);
    expect(isAbortError(new Error("other"))).toBe(false);
  });
});
