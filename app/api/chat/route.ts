import { askGenAi } from "@/lib/ai";
import { buildLocalAnswer, localSuggestions } from "@/lib/assistant";
import { buildAdvice } from "@/lib/engine";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sampleReading } from "@/lib/sample-air";
import { translateTexts } from "@/lib/translate";
import {
  sanitiseAirReading,
  sanitiseChatText,
  sanitiseProfile,
} from "@/lib/validation";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 24_000;

interface ChatBody {
  message?: unknown;
  history?: unknown;
  profile?: unknown;
  air?: unknown;
  locale?: unknown;
  standard?: unknown;
}

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

  const limiter = rateLimit(clientKey(request.headers, "chat"), 16, 60_000);
  if (!limiter.allowed) {
    return Response.json(
      { error: "The assistant is taking a short break. Try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limiter.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: ChatBody;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }
    body = JSON.parse(raw) as ChatBody;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = sanitiseChatText(body.message);
  if (!message) {
    return Response.json(
      { error: "Ask a question between 1 and 600 characters." },
      { status: 400 },
    );
  }

  const profile = sanitiseProfile(body.profile);
  const air = sanitiseAirReading(body.air, profile) ?? sampleReading(profile.city);
  const standard = body.standard === "us" ? "us" : "naqi";
  const locale = body.locale === "hi" ? "hi" : "en";
  const advice = buildAdvice(profile, air, standard);
  const local = buildLocalAnswer(message, profile, air, advice);

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .slice(-6)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const role = record.role === "assistant" ? "assistant" : record.role === "user" ? "user" : null;
      const content = sanitiseChatText(record.content);
      if (!role || !content) return null;
      return { role, content: content.slice(0, 400) };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => item !== null);

  const generated = await askGenAi(message, history, profile, air, advice);
  let answer = generated ?? local.answer;
  if (locale === "hi" && answer) {
    const translated = await translateTexts([answer], "hi");
    if (translated?.[0]) answer = translated[0];
  }

  return Response.json(
    {
      answer,
      mode: generated ? "ai" : "local",
      suggestions: localSuggestions(profile),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
