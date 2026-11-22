"use client";

import Link from "next/link";
import { formatObservedAt } from "@/lib/format";
import { translate } from "@/lib/i18n";
import type { AirReading, Locale } from "@/lib/types";
import { Logo } from "../Logo";

interface SiteFooterProps {
  air: AirReading | null;
  locale: Locale;
  onOpenAssistant: () => void;
}

export function SiteFooter({ air, locale, onOpenAssistant }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p className="footer-tagline">{translate(locale, "footer.tagline")}</p>
        </div>
        <nav className="footer-nav" aria-label={translate(locale, "footer.nav")}>
          <a href="#playbook">{translate(locale, "footer.today")}</a>
          <a href="#choices">{translate(locale, "footer.choices")}</a>
          <Link href="/dashboard">{translate(locale, "footer.dashboard")}</Link>
          <button type="button" className="footer-nav-button" onClick={onOpenAssistant}>
            {translate(locale, "footer.ask")}
          </button>
          <a href="#community">{translate(locale, "footer.community")}</a>
        </nav>
        <div className="footer-source">
          <span className="eyebrow">{translate(locale, "footer.data")}</span>
          <p>{translate(locale, "footer.airSource")}</p>
          <p>
            {air
              ? translate(locale, "footer.reading", {
                  time: formatObservedAt(air.observedAt),
                })
              : translate(locale, "footer.liveLoading")}{" "}
            {translate(locale, "footer.notMedical")}
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{translate(locale, "footer.saansMeans")}</span>
        <span>{translate(locale, "footer.noAccount")}</span>
        <span>{translate(locale, "footer.built")}</span>
      </div>
    </footer>
  );
}
