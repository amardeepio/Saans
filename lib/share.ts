export interface ShareContent {
  title: string;
  scaleLabel: string;
  value: number | string;
  label: string;
  /** Cleanest outdoor window, already localised. */
  windowLabel?: string;
  /** One-line positioning, already localised. */
  tagline: string;
}

export interface ShareLinks {
  whatsapp: string;
  x: string;
  telegram: string;
}

/** The message people actually paste into a group chat. */
export function buildShareText(content: ShareContent): string {
  const reading = `${content.title} — ${content.scaleLabel} ${content.value} (${content.label}).`;
  const window = content.windowLabel ? ` Cleanest window: ${content.windowLabel}.` : "";
  return `${reading}${window} ${content.tagline}`.replace(/\s+/g, " ").trim();
}

export function shareUrl(origin: string, path = "/"): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  try {
    return new URL(path.replace(/^\/+/, ""), base).toString();
  } catch {
    return base;
  }
}

/**
 * WhatsApp takes the link inside `text`, while X and Telegram take it as a
 * separate parameter. All three need full percent-encoding.
 */
export function buildShareLinks(text: string, url: string): ShareLinks {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };
}
