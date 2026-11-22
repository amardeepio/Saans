"use client";

import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ reset }: ErrorProps) {
  return (
    <main className="page-shell" style={{ paddingBlock: "4rem" }}>
      <section className="panel" aria-labelledby="app-error-heading">
        <p className="eyebrow">Something went sideways</p>
        <h1 id="app-error-heading" className="section-title">
          Saans hit an unexpected snag.
        </h1>
        <p className="section-intro">
          Your household profile is still safely stored in this browser. Try reloading this view
          or return to the home plan.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <button type="button" className="button button-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="button button-secondary">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
