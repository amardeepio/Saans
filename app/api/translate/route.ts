import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isTranslationConfigured, translateTexts } from "@/lib/translate";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;
const MAX_TEXTS = 80;
const MAX_TEXT_LENGTH = 900;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

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
    return Response.json(
      { error: "Too many translation requests.", translations: null },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request is too large.", translations: null }, { status: 413 });
  }

  let body: { texts?: unknown; target?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return Response.json({ error: "Request is too large.", translations: null }, { status: 413 });
    }
    body = JSON.parse(raw) as { texts?: unknown; target?: unknown };
  } catch {
    return Response.json({ error: "Invalid request.", translations: null }, { status: 400 });
  }

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
