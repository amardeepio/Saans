import { afterEach, describe, expect, it, vi } from "vitest";
import { getCityDetails } from "@/lib/air";
import { CITIES } from "@/lib/cities";

const DELHI = CITIES.find((city) => city.id === "delhi")!;
const MUMBAI = CITIES.find((city) => city.id === "mumbai")!;

function jsonResponse(payload: unknown): Response {
  return { ok: true, json: async () => payload } as Response;
}

describe("batch city details", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("joins air and weather into pollutant-rich city details", async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("air-quality")) {
        return jsonResponse([
          {
            current: {
              time: "2026-11-20T11:30",
              pm2_5: 102.4,
              pm10: 103.4,
              carbon_monoxide: 1213,
              sulphur_dioxide: 42.8,
              nitrogen_dioxide: 24.4,
              ozone: 168,
              us_aqi: 203,
            },
          },
          {
            current: {
              time: "2026-11-20T11:30",
              pm2_5: 63.8,
              pm10: 67.3,
              carbon_monoxide: 388,
              sulphur_dioxide: 30.4,
              nitrogen_dioxide: 21.9,
              ozone: 157,
              us_aqi: 149,
            },
          },
        ]);
      }
      return jsonResponse([
        {
          current: {
            temperature_2m: 23.1,
            apparent_temperature: 23.8,
            relative_humidity_2m: 56,
            wind_speed_10m: 4.4,
            weather_code: 0,
          },
        },
        {
          current: {
            temperature_2m: 31.2,
            apparent_temperature: 34,
            relative_humidity_2m: 63,
            wind_speed_10m: 8.2,
            weather_code: 1,
          },
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const details = await getCityDetails([DELHI, MUMBAI]);

    expect(details).toHaveLength(2);
    expect(details[0].city.id).toBe("delhi");
    expect(details[0].aqi).toBe(203);
    expect(details[0].pm25).toBe(102.4);
    expect(details[0].co).toBe(1213);
    expect(details[0].so2).toBe(42.8);
    expect(details[0].weather.temperatureC).toBe(23.1);
    expect(details[0].source).toBe("open-meteo");
    expect(details[1].weather.label).toBe("Partly cloudy");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("latitude=28.6139%2C19.0760"))).toBe(true);
  });

  it("returns labelled samples when both upstream services fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    const details = await getCityDetails([DELHI, MUMBAI]);
    expect(details).toHaveLength(2);
    expect(details.every((detail) => detail.source === "sample")).toBe(true);
    expect(details.every((detail) => detail.weather.source === "sample")).toBe(true);
    expect(details.every((detail) => detail.aqi > 0)).toBe(true);
  });
});
