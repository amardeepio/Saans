"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: "40rem", margin: "0 auto" }}>
        <h1>Saans hit an unexpected error</h1>
        <p>
          Your household profile stays stored locally in your browser. Reload to continue.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "1px solid currentColor",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Reload Saans
        </button>
      </body>
    </html>
  );
}
