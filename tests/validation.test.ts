import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/cities";
import {
  deserialiseProfile,
  sanitiseAirReading,
  sanitiseChatText,
  sanitiseCity,
  sanitiseProfile,
  serialiseProfile,
} from "@/lib/validation";

describe("profile validation", () => {
  it("clamps counts, coordinates and enums from untrusted storage", () => {
    const profile = sanitiseProfile({
      displayName: "  The   Verma family ",
      city: {
        id: "x",
        name: "Test",
        country: "IN",
        latitude: 999,
        longitude: -999,
      },
      household: { adults: 999, children: -4, elders: 99, respiratory: "yes", pregnant: true },
      home: { cookingFuel: "plutonium", purifier: "many", indoorSmoke: "candles" },
      mobility: { primary: "rocket", commuteMinutes: 999, schoolRun: "yes", workFromHomeDays: -3 },
      budget: "lavish",
      priorities: ["health", "health", "malware", "planet"],
    });

    expect(profile.displayName).toBe("The Verma family");
    expect(profile.household.adults).toBe(12);
    expect(profile.household.children).toBe(0);
    expect(profile.household.respiratory).toBe(true);
    expect(profile.home.cookingFuel).toBe(DEFAULT_PROFILE.home.cookingFuel);
    expect(profile.home.purifier).toBe(DEFAULT_PROFILE.home.purifier);
    expect(profile.mobility.primary).toBe(DEFAULT_PROFILE.mobility.primary);
    expect(profile.mobility.commuteMinutes).toBe(180);
    expect(profile.priorities).toEqual(["health", "planet"]);
    expect(profile.city.latitude).toBeGreaterThanOrEqual(-90);
    expect(profile.city.latitude).toBeLessThanOrEqual(90);
    expect(profile.city.longitude).toBeGreaterThanOrEqual(-180);
    expect(profile.city.longitude).toBeLessThanOrEqual(180);
  });

  it("never returns an empty priority list", () => {
    const profile = sanitiseProfile({ priorities: ["bad"] });
    expect(profile.priorities.length).toBeGreaterThan(0);
  });

  it("round-trips through versioned local storage", () => {
    const serialised = serialiseProfile(DEFAULT_PROFILE);
    const restored = deserialiseProfile(serialised);
    expect(restored?.city.id).toBe(DEFAULT_PROFILE.city.id);
    expect(restored?.household.children).toBe(DEFAULT_PROFILE.household.children);
  });

  it("rejects malformed or unversioned storage", () => {
    expect(deserialiseProfile(null)).toBeNull();
    expect(deserialiseProfile("not json")).toBeNull();
    expect(deserialiseProfile('{"profile":{}}')).toBeNull();
    expect(deserialiseProfile('{"version":2,"profile":{}}')).toBeNull();
  });

  it("validates a city independently", () => {
    const city = sanitiseCity({
      name: "  Lahore ",
      country: "Pakistan",
      latitude: "31.55",
      longitude: "74.34",
    });
    expect(city.name).toBe("Lahore");
    expect(city.latitude).toBe(31.55);
    expect(city.longitude).toBe(74.34);
  });

  it("clamps air readings and repairs short forecasts", () => {
    const air = sanitiseAirReading(
      {
        aqi: 9000,
        pm25: -50,
        category: "custom",
        categoryLabel: "<b>bad</b>",
        source: "open-meteo",
        hourly: [{ time: "2026-01-01T08:00", aqi: 400, pm25: 200 }],
      },
      DEFAULT_PROFILE,
    );
    expect(air).not.toBeNull();
    expect(air?.aqi).toBe(500);
    expect(air?.pm25).toBe(0);
    expect(air?.hourly.length).toBe(1);
    expect(air?.source).toBe("open-meteo");
    expect(air?.category).toBe("hazardous");
    expect(air?.categoryLabel).toBe("Hazardous");
    expect(air?.weather.temperatureC).toBeGreaterThan(-60);
    expect(air?.weather.source).toBe("sample");
    expect(air?.co).toBe(0);
    expect(air?.so2).toBe(0);
  });

  it("rejects an absent or negative AQI", () => {
    expect(sanitiseAirReading({}, DEFAULT_PROFILE)).toBeNull();
    expect(sanitiseAirReading({ aqi: -1 }, DEFAULT_PROFILE)).toBeNull();
  });

  it("enforces chat length limits", () => {
    expect(sanitiseChatText("  ")).toBeNull();
    expect(sanitiseChatText("x".repeat(601))).toBeNull();
    expect(sanitiseChatText("  hello  ")).toBe("hello");
    expect(sanitiseChatText(42)).toBeNull();
  });
});
