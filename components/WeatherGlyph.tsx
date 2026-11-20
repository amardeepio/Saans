import type { SVGProps } from "react";

export type WeatherKind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";

export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "fog";
}

interface WeatherGlyphProps extends SVGProps<SVGSVGElement> {
  code: number;
  size?: number;
}

export function WeatherGlyph({ code, size = 18, ...props }: WeatherGlyphProps) {
  const kind = weatherKind(code);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {kind === "clear" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </>
      )}
      {kind === "cloud" && (
        <>
          <path d="M7 18h10.5a3.5 3.5 0 0 0 .2-7 5 5 0 0 0-9.5-1.4A3.8 3.8 0 0 0 7 18Z" />
          <path d="M9 21h-.1M13 21h-.1M17 21h-.1" />
        </>
      )}
      {kind === "fog" && (
        <>
          <path d="M5 9h14M3 13h18M6 17h14" />
          <path d="M8 5h8" opacity=".55" />
        </>
      )}
      {kind === "rain" && (
        <>
          <path d="M7 15.5h10.5a3.3 3.3 0 0 0 .2-6.6 4.8 4.8 0 0 0-9.1-1.4A3.6 3.6 0 0 0 7 15.5Z" />
          <path d="m9 19-1 2M13 19l-1 2M17 19l-1 2" />
        </>
      )}
      {kind === "snow" && (
        <>
          <path d="M7 14.5h10.5a3.3 3.3 0 0 0 .2-6.6 4.8 4.8 0 0 0-9.1-1.4A3.6 3.6 0 0 0 7 14.5Z" />
          <path d="M8.5 18.5h.01M12 20h.01M15.5 18.5h.01" />
        </>
      )}
      {kind === "storm" && (
        <>
          <path d="M7 14.5h10.5a3.3 3.3 0 0 0 .2-6.6 4.8 4.8 0 0 0-9.1-1.4A3.6 3.6 0 0 0 7 14.5Z" />
          <path d="m13 16-2.5 4h3L11 24" />
        </>
      )}
    </svg>
  );
}
