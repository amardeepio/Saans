"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAdvice } from "@/lib/engine";
import { applyAdviceTranslations, collectAdviceStrings } from "@/lib/localize-advice";
import type { Advice, AirReading, AqiStandard, Locale, Profile } from "@/lib/types";

interface TranslationCache {
  source: Advice;
  locale: Locale;
  translated: Advice;
}

export function useLocalizedAdvice(
  profile: Profile,
  air: AirReading | null,
  standard: AqiStandard,
  locale: Locale,
): Advice | null {
  const baseAdvice = useMemo(
    () => (air ? buildAdvice(profile, air, standard) : null),
    [profile, air, standard],
  );
  const [cache, setCache] = useState<TranslationCache | null>(null);

  useEffect(() => {
    if (!baseAdvice || locale === "en") return;

    let cancelled = false;
    const texts = collectAdviceStrings(baseAdvice);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target: "hi" }),
      signal: AbortSignal.timeout(20_000),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { translations?: string[] };
      })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.translations) && data.translations.length === texts.length) {
          setCache({
            source: baseAdvice,
            locale,
            translated: applyAdviceTranslations(baseAdvice, data.translations),
          });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [baseAdvice, locale]);

  if (cache && cache.source === baseAdvice && cache.locale === locale) {
    return cache.translated;
  }
  return baseAdvice;
}
