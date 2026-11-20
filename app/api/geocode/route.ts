import { CITIES } from "@/lib/cities";
import { isIndianCity, isIndianGeocodeResult } from "@/lib/india";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sanitiseCity } from "@/lib/validation";
import type { City } from "@/lib/types";

export const runtime = "nodejs";

interface GeocodeResult {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
}

interface GeocodeResponse {
  results?: GeocodeResult[];
}

function staticMatches(query: string, indiaOnly: boolean): City[] {
  const needle = query.toLowerCase();
  return CITIES.filter((city) => {
    if (indiaOnly && !isIndianCity(city)) return false;
    const haystack = `${city.name} ${city.region ?? ""} ${city.country}`.toLowerCase();
    return haystack.includes(needle);
  }).slice(0, 6);
}

async function remoteMatches(query: string, indiaOnly: boolean): Promise<City[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (indiaOnly) url.searchParams.set("countryCode", "IN");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as GeocodeResponse;
    if (!Array.isArray(data.results)) return [];

    return data.results
      .filter((result) => {
        return (
          typeof result.name === "string" &&
          typeof result.latitude === "number" &&
          typeof result.longitude === "number" &&
          result.latitude >= -90 &&
          result.latitude <= 90 &&
          result.longitude >= -180 &&
          result.longitude <= 180 &&
          (!indiaOnly || isIndianGeocodeResult(result))
        );
      })
      .map((result) =>
        sanitiseCity({
          id: `geo-${result.id ?? `${result.latitude}-${result.longitude}`}`,
          name: result.name,
          region: result.admin1,
          country: result.country ?? "",
          latitude: result.latitude,
          longitude: result.longitude,
        }),
      );
  } catch {
    return [];
  }
}

export async function GET(request: Request): Promise<Response> {
  const limiter = rateLimit(clientKey(request.headers, "geocode"), 40, 60_000);
  if (!limiter.allowed) {
    return Response.json(
      { error: "Too many searches. Please wait a moment.", results: [] },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } },
    );
  }

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 80);
  const indiaOnly = params.get("country")?.toUpperCase() === "IN";
  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  const local = staticMatches(query, indiaOnly);
  const remote = local.length >= 4 ? [] : await remoteMatches(query, indiaOnly);
  const seen = new Set<string>();
  const results = [...local, ...remote]
    .filter((city) => {
      const key = `${city.name.toLowerCase()}-${city.country.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);

  return Response.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}
