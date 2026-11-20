import { getAirReading } from "@/lib/air";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sanitiseCity } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const limiter = rateLimit(clientKey(request.headers, "air"), 90, 60_000);
  if (!limiter.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      },
    );
  }

  const url = new URL(request.url);
  const latitude = url.searchParams.get("lat");
  const longitude = url.searchParams.get("lon");
  const name = (url.searchParams.get("name") ?? "").slice(0, 80);
  const country = (url.searchParams.get("country") ?? "").slice(0, 80);
  const region = (url.searchParams.get("region") ?? "").slice(0, 80);

  if (!latitude || !longitude) {
    return Response.json({ error: "Location is required." }, { status: 400 });
  }

  const city = sanitiseCity({
    id: url.searchParams.get("id") ?? "custom",
    name: name || "Your neighbourhood",
    region: region || undefined,
    country: country || "Unknown",
    latitude,
    longitude,
  });

  const reading = await getAirReading(city);

  return Response.json(reading, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
