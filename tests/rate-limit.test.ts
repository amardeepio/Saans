import { describe, expect, it } from "vitest";
import { clientKey, rateLimit } from "@/lib/rate-limit";

describe("in-memory rate limiter", () => {
  it("allows requests up to the limit, then blocks with a retry window", () => {
    const key = `test-${Math.random()}`;
    const now = 1_700_000_000_000;

    expect(rateLimit(key, 2, 60_000, now).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000, now + 10).allowed).toBe(true);
    const blocked = rateLimit(key, 2, 60_000, now + 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(blocked.remaining).toBe(0);
  });

  it("opens a new window after expiry", () => {
    const key = `test-${Math.random()}`;
    const now = 1_700_000_000_000;
    rateLimit(key, 1, 1_000, now);
    expect(rateLimit(key, 1, 1_000, now + 500).allowed).toBe(false);
    expect(rateLimit(key, 1, 1_000, now + 1_500).allowed).toBe(true);
  });

  it("derives a stable key from common proxy headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.4, 10.0.0.1",
      "x-real-ip": "10.0.0.1",
    });
    expect(clientKey(headers, "chat")).toBe("chat:203.0.113.4");
    expect(clientKey(new Headers(), "chat")).toBe("chat:local");
  });
});
