import { describe, expect, it } from "vitest";
import { isSameOrigin, rateLimitResponse, readBoundedJson } from "@/lib/http";

describe("HTTP route helpers", () => {
  it("validates same-origin requests and rejects cross-origin or malformed origins", () => {
    const noOrigin = new Request("https://saans.example/api/chat", {
      headers: { host: "saans.example" },
    });
    expect(isSameOrigin(noOrigin)).toBe(true);

    const sameOrigin = new Request("https://saans.example/api/chat", {
      headers: { host: "saans.example", origin: "https://saans.example" },
    });
    expect(isSameOrigin(sameOrigin)).toBe(true);

    const crossOrigin = new Request("https://saans.example/api/chat", {
      headers: { host: "saans.example", origin: "https://evil.example" },
    });
    expect(isSameOrigin(crossOrigin)).toBe(false);

    const malformed = new Request("https://saans.example/api/chat", {
      headers: { host: "saans.example", origin: "not-a-url" },
    });
    expect(isSameOrigin(malformed)).toBe(false);
  });

  it("builds a 429 rate-limit response with Retry-After and optional Cache-Control", async () => {
    const response = rateLimitResponse(
      42,
      "Slow down",
      { cities: [] },
      { noStore: true },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Slow down", cities: [] });
  });

  it("reads bounded JSON and rejects oversized or invalid payloads", async () => {
    const valid = new Request("https://saans.example/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
    });
    const ok = await readBoundedJson<{ message: string }>(valid, 1024);
    expect(ok).toEqual({ ok: true, data: { message: "hello" } });

    const declaredTooBig = new Request("https://saans.example/api/chat", {
      method: "POST",
      headers: { "content-length": "5000" },
      body: "{}",
    });
    const resDeclared = await readBoundedJson(declaredTooBig, 100);
    expect(resDeclared.ok).toBe(false);
    if (!resDeclared.ok) expect(resDeclared.response.status).toBe(413);

    const bodyTooBig = new Request("https://saans.example/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "a".repeat(200) }),
    });
    const resBody = await readBoundedJson(bodyTooBig, 100, { translations: null });
    expect(resBody.ok).toBe(false);
    if (!resBody.ok) {
      expect(resBody.response.status).toBe(413);
      expect(await resBody.response.json()).toEqual({
        error: "Request is too large.",
        translations: null,
      });
    }

    const badJson = new Request("https://saans.example/api/chat", {
      method: "POST",
      body: "{broken",
    });
    const resBad = await readBoundedJson(badJson, 100);
    expect(resBad.ok).toBe(false);
    if (!resBad.ok) expect(resBad.response.status).toBe(400);
  });
});
