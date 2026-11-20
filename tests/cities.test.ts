import { describe, expect, it } from "vitest";
import { CITIES, cityLabel, DEFAULT_PROFILE, findCity } from "@/lib/cities";

describe("city catalogue", () => {
  it("finds tracked cities and formats region labels", () => {
    expect(findCity("delhi")?.name).toBe("Delhi");
    expect(findCity("missing")).toBeUndefined();
    expect(cityLabel(DEFAULT_PROFILE.city)).toContain("Delhi");
    expect(cityLabel(CITIES.find((city) => city.id === "mumbai")!)).toBe("Mumbai, Maharashtra");
  });

  it("keeps the default profile internally consistent", () => {
    expect(DEFAULT_PROFILE.household.adults).toBeGreaterThan(0);
    expect(DEFAULT_PROFILE.city.country).toBe("India");
    expect(DEFAULT_PROFILE.priorities.length).toBeGreaterThan(0);
  });
});
