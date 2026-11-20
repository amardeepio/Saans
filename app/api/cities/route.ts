import { getCityDetails } from "@/lib/air";
import { CITIES } from "@/lib/cities";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const METRO_IDS = ["mumbai", "delhi", "chennai", "kolkata", "bengaluru"];

export async function GET(request: Request): Promise<Response> {
  const limiter = rateLimit(clientKey(request.headers, "cities"), 60, 60_000);
  if (!limiter.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment.", cities: [] },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } },
    );
  }

  const metros = METRO_IDS.map((id) => CITIES.find((city) => city.id === id)).filter(
    (city): city is NonNullable<typeof city> => Boolean(city),
  );

  const cities = await getCityDetails(metros);

  return Response.json(
    { cities },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
