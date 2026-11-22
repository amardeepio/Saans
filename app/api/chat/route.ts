import { askGenAi, cleanAnswerText, containsUnsafeAdvice, isGenAiConfigured, streamGenAi } from "@/lib/ai";
import { buildLocalAnswer } from "@/lib/answers";
import { buildAdvice } from "@/lib/engine";
import { isSameOrigin, rateLimitResponse, readBoundedJson } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sampleReading } from "@/lib/sample-air";
import { translateTexts } from "@/lib/translate";
import type { ChatStreamEvent } from "@/lib/types";
import {
  sanitizeAirReading,
  sanitizeChatText,
  sanitizeProfile,
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

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const limiter = rateLimit(clientKey(request.headers, "chat"), 16, 60_000);
  if (!limiter.allowed) {
    return rateLimitResponse(
      limiter.retryAfterSeconds,
      "The assistant is taking a short break. Try again in a minute.",
      undefined,
      { noStore: true },
    );
  }

  const parsed = await readBoundedJson<ChatBody>(request, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const message = sanitizeChatText(body.message);
  if (!message) {
    return Response.json(
      { error: "Ask a question between 1 and 600 characters." },
      { status: 400 },
    );
  }

  const profile = sanitizeProfile(body.profile);
  const air = sanitizeAirReading(body.air, profile) ?? sampleReading(profile.city);
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
      const content = sanitizeChatText(record.content);
      if (!role || !content) return null;
      return { role, content: content.slice(0, 400) };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => item !== null);

  // Hindi needs the whole answer before it can be translated, so it takes the
  // single-shot path even when the model is configured.
  const wantsStream = isGenAiConfigured() && locale !== "hi";
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          cancelled = true;
        }
      };

      const fallback = (note?: string) => {
        send({ type: "replace", text: local.answer });
        send({ type: "done", mode: "local", suggestions: local.suggestions, note });
      };

      try {
        if (wantsStream) {
          let accumulated = "";
          for await (const delta of streamGenAi(message, history, profile, air, advice)) {
            accumulated += delta;
            send({ type: "delta", text: delta });
          }

          const cleaned = cleanAnswerText(accumulated.replace(/\u0000/g, "")).slice(0, 1_600);
          if (cleaned.length <= 20) {
            fallback();
          } else if (containsUnsafeAdvice(cleaned, air.aqi, profile)) {
            fallback("Saans replaced that answer with its vetted household guidance.");
          } else {
            // Reconcile now that the whole answer is known: strips markdown
            // that was split across chunks.
            send({ type: "replace", text: cleaned });
            send({ type: "done", mode: "ai", suggestions: local.suggestions });
          }
        } else {
          const generated = await askGenAi(message, history, profile, air, advice);
          let answer = generated ?? local.answer;
          if (locale === "hi") {
            const translated = await translateTexts([answer], "hi");
            if (translated?.[0]) answer = translated[0];
          }
          send({ type: "replace", text: answer });
          send({
            type: "done",
            mode: generated ? "ai" : "local",
            suggestions: local.suggestions,
          });
        }
      } catch {
        fallback(
          "The live assistant was unavailable, so this answer used Saans's offline household logic.",
        );
      } finally {
        if (!cancelled) {
          try {
            controller.close();
          } catch {
            // Already closed by the client aborting.
          }
        }
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}
