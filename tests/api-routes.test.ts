import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getAir } from "@/app/api/air/route";
import { POST as postChat } from "@/app/api/chat/route";
import { GET as getCities } from "@/app/api/cities/route";
import { GET as getGeocode } from "@/app/api/geocode/route";
import { GET as getIndiaCities } from "@/app/api/india-cities/route";
import { POST as postTranslate } from "@/app/api/translate/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function uniqueIp(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

describe("API route handlers", () => {
  it("GET /api/air validates required coordinates and returns a reading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const missing = await getAir(
      new Request("http://localhost:3000/api/air", {
        headers: { "x-forwarded-for": uniqueIp("air") },
      }),
    );
    expect(missing.status).toBe(400);

    const ok = await getAir(
      new Request(
        "http://localhost:3000/api/air?id=delhi&name=Delhi&country=India&lat=28.6139&lon=77.209",
        { headers: { "x-forwarded-for": uniqueIp("air") } },
      ),
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { city: { name: string }; aqi: number };
    expect(body.city.name).toBe("Delhi");
    expect(body.aqi).toBeGreaterThan(0);
  });

  it("GET /api/cities and /api/india-cities return ranked city summaries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const metros = await getCities(
      new Request("http://localhost:3000/api/cities", {
        headers: { "x-forwarded-for": uniqueIp("cities") },
      }),
    );
    expect(metros.status).toBe(200);
    const metroBody = (await metros.json()) as { cities: unknown[] };
    expect(metroBody.cities.length).toBe(5);

    const india = await getIndiaCities(
      new Request("http://localhost:3000/api/india-cities", {
        headers: { "x-forwarded-for": uniqueIp("india") },
      }),
    );
    expect(india.status).toBe(200);
    const indiaBody = (await india.json()) as {
      cities: Array<{ aqi: number }>;
      trackedCount: number;
    };
    expect(indiaBody.cities.length).toBe(indiaBody.trackedCount);
    expect(indiaBody.cities[0].aqi).toBeGreaterThanOrEqual(
      indiaBody.cities[indiaBody.cities.length - 1].aqi,
    );
  });

  it("GET /api/geocode returns empty for short queries and matches Indian cities", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const short = await getGeocode(
      new Request("http://localhost:3000/api/geocode?q=d", {
        headers: { "x-forwarded-for": uniqueIp("geo") },
      }),
    );
    expect(short.status).toBe(200);
    expect(await short.json()).toEqual({ results: [] });

    const delhi = await getGeocode(
      new Request("http://localhost:3000/api/geocode?q=Delhi&country=IN", {
        headers: { "x-forwarded-for": uniqueIp("geo") },
      }),
    );
    expect(delhi.status).toBe(200);
    const data = (await delhi.json()) as { results: Array<{ name: string }> };
    expect(data.results.some((city) => city.name === "Delhi")).toBe(true);
  });

  it("POST /api/chat enforces origin, payload validation, and streams offline answers", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const crossOrigin = await postChat(
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://attacker.example",
          "x-forwarded-for": uniqueIp("chat"),
        },
        body: JSON.stringify({ message: "How is the air?" }),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const emptyMessage = await postChat(
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "x-forwarded-for": uniqueIp("chat"),
        },
        body: JSON.stringify({ message: "   " }),
      }),
    );
    expect(emptyMessage.status).toBe(400);

    const ok = await postChat(
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "x-forwarded-for": uniqueIp("chat"),
        },
        body: JSON.stringify({ message: "Should we take the school bus?" }),
      }),
    );
    expect(ok.status).toBe(200);
    const ndjson = await ok.text();
    expect(ndjson).toContain('"type":"done"');
  });

  it("POST /api/translate enforces origin and returns 503 when unconfigured", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");

    const crossOrigin = await postTranslate(
      new Request("http://localhost:3000/api/translate", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://attacker.example",
          "x-forwarded-for": uniqueIp("tr"),
        },
        body: JSON.stringify({ texts: ["Hello"], target: "hi" }),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const unconfigured = await postTranslate(
      new Request("http://localhost:3000/api/translate", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "x-forwarded-for": uniqueIp("tr"),
        },
        body: JSON.stringify({ texts: ["Hello"], target: "hi" }),
      }),
    );
    expect(unconfigured.status).toBe(503);
  });
});
