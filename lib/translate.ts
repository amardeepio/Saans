const CACHE = new Map<string, string>();
const MAX_CACHE = 800;

function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
}

/**
 * Optional server-side translation for generated household copy. The key is
 * never exposed to the browser. If the provider is missing or fails, the
 * caller keeps the reviewed English text.
 */
export async function translateTexts(
  texts: string[],
  target: "hi",
): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;

  const cleaned = texts.map((text) => text.replace(/\u0000/g, "").slice(0, 900));
  const results: string[] = new Array(cleaned.length);
  const missing: Array<{ index: number; text: string }> = [];

  cleaned.forEach((text, index) => {
    const cacheKey = `${target}:${text}`;
    const cached = CACHE.get(cacheKey);
    if (cached) results[index] = cached;
    else if (text.trim()) missing.push({ index, text });
    else results[index] = text;
  });

  if (missing.length === 0) return results;

  // The v2 endpoint accepts a q array. Keep each request modest.
  for (let start = 0; start < missing.length; start += 25) {
    const batch = missing.slice(start, start + 25);
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: batch.map((item) => item.text),
            target,
            source: "en",
            format: "text",
          }),
          signal: AbortSignal.timeout(12_000),
          cache: "no-store",
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as {
        data?: { translations?: Array<{ translatedText?: string }> };
      };
      const translations = data.data?.translations;
      if (!Array.isArray(translations) || translations.length !== batch.length) return null;

      translations.forEach((translation, offset) => {
        const item = batch[offset];
        const value = decodeEntities(
          typeof translation.translatedText === "string" ? translation.translatedText : item.text,
        );
        results[item.index] = value;
        if (CACHE.size < MAX_CACHE) CACHE.set(`${target}:${item.text}`, value);
      });
    } catch {
      return null;
    }
  }

  return results;
}
