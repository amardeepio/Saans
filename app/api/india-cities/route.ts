import { getCityDetails } from "@/lib/air";
import { INDIA_TRACKED_CITIES, INDIA_TRACKED_IDS } from "@/lib/india";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const limiter = rateLimit(clientKey(request.headers, "india-cities"), 30, 60_000);
  if (!limiter.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment.", cities: [], trackedCount: 0 },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } },
    );
  }

  const cities = await getCityDetails(INDIA_TRACKED_CITIES);
  cities.sort((a, b) => b.aqi - a.aqi);

  return Response.json(
    {
      cities,
      trackedCount: INDIA_TRACKED_IDS.length,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
