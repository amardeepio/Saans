import { isSameOrigin, rateLimitResponse, readBoundedJson } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isTranslationConfigured, translateTexts } from "@/lib/translate";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;
const MAX_TEXTS = 80;
const MAX_TEXT_LENGTH = 900;

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  if (!isTranslationConfigured()) {
    return Response.json(
      { error: "Translation is not configured on this deployment.", translations: null },
      { status: 503 },
    );
  }

  const limiter = rateLimit(clientKey(request.headers, "translate"), 20, 60_000);
  if (!limiter.allowed) {
    return rateLimitResponse(
      limiter.retryAfterSeconds,
      "Too many translation requests.",
      { translations: null },
    );
  }

  const parsed = await readBoundedJson<{ texts?: unknown; target?: unknown }>(
    request,
    MAX_BODY_BYTES,
    { translations: null },
  );
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (body.target !== "hi") {
    return Response.json({ error: "Unsupported target language.", translations: null }, { status: 400 });
  }

  const texts = Array.isArray(body.texts)
    ? body.texts
        .filter((item): item is string => typeof item === "string")
        .slice(0, MAX_TEXTS)
        .map((item) => item.slice(0, MAX_TEXT_LENGTH))
    : [];

  if (texts.length === 0) {
    return Response.json({ translations: [] });
  }

  const translations = await translateTexts(texts, "hi");
  if (!translations) {
    return Response.json(
      { error: "Translation is temporarily unavailable.", translations: null },
      { status: 502 },
    );
  }

  return Response.json(
    { translations },
    {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
