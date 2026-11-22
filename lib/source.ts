import { translate } from "./i18n";
import type { Locale } from "./types";

/** Shared wording for the "how live is this?" indicator. */
export function sourceStatusLabel(liveCount: number, total: number, locale: Locale): string {
  if (total === 0) return translate(locale, "source.sample");
  if (liveCount === total) return translate(locale, "source.live");
  return liveCount > 0 ? translate(locale, "source.partlyLive") : translate(locale, "source.sample");
}
