export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo-lockup">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42" role="img" focusable="false">
          <circle cx="21" cy="21" r="20" fill="currentColor" />
          <path
            d="M10 15.5h14.2a4.1 4.1 0 1 0-4-4.6"
            fill="none"
            stroke="#d9f36a"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M9 21h19.4a3.3 3.3 0 1 1-3.2 3.3"
            fill="none"
            stroke="#f6f1e6"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M11 26.5h9.1a3.3 3.3 0 1 1-3.2 3.3"
            fill="none"
            stroke="#d9f36a"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="wordmark">
          saans<span className="wordmark-dot">.</span>
        </span>
      )}
    </span>
  );
}
