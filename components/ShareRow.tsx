"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { translate } from "@/lib/i18n";
import { buildShareLinks, buildShareText, shareUrl } from "@/lib/share";
import { SITE_URL } from "@/lib/site";
import { Icon } from "./Icon";
import { usePreferences } from "./PreferencesProvider";

interface ShareRowProps {
  title: string;
  value: number | string;
  scaleLabel: string;
  label: string;
  windowLabel?: string;
  /** Path to share, e.g. `/dashboard?city=patna`. Defaults to the home page. */
  path?: string;
  className?: string;
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.45.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.05-.52-.1-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.09.54 4.14 1.58 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.4" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

function TelegramGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M11.94 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0Zm4.96 7.22c.1 0 .32.02.47.14a.5.5 0 0 1 .17.33c.02.09.04.3.02.47-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.23-.46-1.9-.9-1.06-.7-1.66-1.13-2.68-1.8-1.19-.79-.42-1.21.26-1.91.17-.18 3.24-2.98 3.3-3.23.01-.03.02-.15-.05-.21-.07-.06-.18-.04-.25-.02-.1.02-1.8 1.14-5.06 3.34-.48.33-.91.49-1.3.48-.43 0-1.25-.24-1.87-.44-.75-.24-1.35-.37-1.3-.79.03-.21.33-.43.9-.66 3.5-1.52 5.83-2.53 7-3.01 3.33-1.39 4.02-1.63 4.47-1.64Z" />
    </svg>
  );
}

export function ShareRow({
  title,
  value,
  scaleLabel,
  label,
  windowLabel,
  path = "/",
  className,
}: ShareRowProps) {
  const { settings } = usePreferences();
  const locale = settings.locale;
  const origin = useClientValue(() => window.location.origin || SITE_URL, SITE_URL);
  const [copied, setCopied] = useState(false);
  const canNativeShare = useClientValue(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    false,
  );

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const text = useMemo(
    () =>
      buildShareText({
        title,
        scaleLabel,
        value,
        label,
        windowLabel,
        tagline: translate(locale, "share.tagline"),
      }),
    [title, scaleLabel, value, label, windowLabel, locale],
  );

  const url = useMemo(() => shareUrl(origin, path), [origin, path]);
  const links = useMemo(() => buildShareLinks(text, url), [text, url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard can be blocked outside a secure context; the links still work.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // The user dismissed the sheet, or the platform refused.
    }
  }

  return (
    <div className={`share-row ${className ?? ""}`} role="group" aria-label={translate(locale, "share.label")}>
      <span className="share-caption">{translate(locale, "share.label")}</span>
      <a
        className="share-button"
        href={links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={translate(locale, "share.whatsapp")}
        title={translate(locale, "share.whatsapp")}
      >
        <WhatsAppGlyph />
      </a>
      <a
        className="share-button"
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={translate(locale, "share.x")}
        title={translate(locale, "share.x")}
      >
        <XGlyph />
      </a>
      <a
        className="share-button"
        href={links.telegram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={translate(locale, "share.telegram")}
        title={translate(locale, "share.telegram")}
      >
        <TelegramGlyph />
      </a>
      <button
        type="button"
        className="share-button"
        onClick={() => void copy()}
        aria-label={translate(locale, "share.copy")}
        title={translate(locale, "share.copy")}
      >
        <Icon name={copied ? "check" : "copy"} size={15} />
      </button>
      {canNativeShare && (
        <button
          type="button"
          className="share-button share-button--native"
          onClick={() => void nativeShare()}
          aria-label={translate(locale, "share.native")}
          title={translate(locale, "share.native")}
        >
          <Icon name="arrow" size={16} />
        </button>
      )}
      <span className="share-status" role="status" aria-live="polite">
        {copied ? translate(locale, "share.copied") : ""}
      </span>
    </div>
  );
}
