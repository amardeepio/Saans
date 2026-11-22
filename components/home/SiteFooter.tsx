"use client";

import Link from "next/link";
import { formatObservedAt } from "@/lib/format";
import type { AirReading } from "@/lib/types";
import { Logo } from "../Logo";

interface SiteFooterProps {
  air: AirReading | null;
  onOpenAssistant: () => void;
}

export function SiteFooter({ air, onOpenAssistant }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p className="footer-tagline">
            Clearer choices for smoky seasons. Built for families, schools and the streets between
            them.
          </p>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#playbook">Today</a>
          <a href="#choices">Choices lab</a>
          <Link href="/dashboard">India dashboard</Link>
          <button type="button" className="footer-nav-button" onClick={onOpenAssistant}>
            Ask Saans
          </button>
          <a href="#community">Community kit</a>
        </nav>
        <div className="footer-source">
          <span className="eyebrow">Data &amp; care</span>
          <p>
            Air quality from{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
            , a free open-data service. AQI uses the US EPA scale.
          </p>
          <p>
            {air ? `Reading: ${formatObservedAt(air.observedAt)}.` : "Live reading loading."} Saans
            is not a medical device and does not provide diagnosis or treatment.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>saans means breath.</span>
        <span>No accounts · no tracking · profile stays in your browser</span>
        <span>Built with Next.js &amp; TypeScript</span>
      </div>
    </footer>
  );
}
