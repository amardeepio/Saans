import type { PollutantInfo } from "@/lib/pollutants";

export function PollutantGlyph({
  kind,
  size = 30,
}: {
  kind: PollutantInfo["icon"];
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "particles" && (
        <>
          <path d="M9 24h19a5 5 0 0 0 .4-10 7 7 0 0 0-13.2-1.8A5.5 5.5 0 0 0 9 24Z" />
          <circle cx="13" cy="30" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="33" r="1" fill="currentColor" stroke="none" />
          <circle cx="27" cy="29" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="31" cy="33" r=".9" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "gas" && (
        <>
          <path d="M8 20h21a4.5 4.5 0 0 0 .3-9 6.5 6.5 0 0 0-12.1-1.5A5 5 0 0 0 8 20Z" />
          <path d="M13 25h14M10 30h18M15 35h9" />
        </>
      )}
      {kind === "traffic" && (
        <>
          <path d="M7 19h22a4.4 4.4 0 0 0 .3-8.8A6.3 6.3 0 0 0 17.4 8 4.9 4.9 0 0 0 7 19Z" />
          <path d="M18 23v7m0 0-3-3m3 3 3-3" />
        </>
      )}
      {kind === "sun" && (
        <>
          <circle cx="20" cy="18" r="6" />
          <path d="M20 5v3M20 28v3M7 18h3M30 18h3M10.8 8.8l2.1 2.1M27.1 25.1l2.1 2.1M10.8 27.2l2.1-2.1M27.1 10.9l2.1-2.1" />
          <path d="M12 35h16" opacity=".65" />
        </>
      )}
    </svg>
  );
}
