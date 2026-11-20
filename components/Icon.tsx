import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "arrow-right"
  | "check"
  | "chevron"
  | "close"
  | "clock"
  | "chat"
  | "copy"
  | "globe"
  | "home"
  | "info"
  | "leaf"
  | "locate"
  | "mobility"
  | "pin"
  | "search"
  | "shield"
  | "spark"
  | "sun"
  | "users"
  | "wind";

const PATHS: Record<IconName, React.ReactNode> = {
  arrow: <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  "arrow-right": <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  clock: <><circle cx="12" cy="12" r="8.25" /><path d="M12 7.5V12l3 2" /></>,
  chat: <><path d="M20 15.5a3 3 0 0 1-3 3H9l-5 3v-15a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9Z" /><path d="M8 9.5h8M8 13h5" /></>,
  copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.5 3.4 5.5 3.4 9S14.2 18.5 12 21c-2.2-2.5-3.4-5.5-3.4-9S9.8 5.5 12 3Z" /></>,
  home: <><path d="m4 11 8-7 8 7" /><path d="M6 10v9h12v-9M10 19v-5h4v5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  leaf: <><path d="M20 4C12 4 5 7.5 5 14a6 6 0 0 0 6 6c6.5 0 9-7 9-16Z" /><path d="M4 21c2.5-5 6-8.5 11-11" /></>,
  locate: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></>,
  mobility: <><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M8.5 17h7l-2-7h-4L5.5 17M14 10l2-4h2" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>,
  shield: <><path d="M12 21s8-3.5 8-10V5l-8-3-8 3v6c0 6.5 8 10 8 10Z" /><path d="m9 12 2 2 4-5" /></>,
  spark: <><path d="m12 3 1.6 4.8L18 9.5l-4.4 1.7L12 16l-1.6-4.8L6 9.5l4.4-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" /><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14.9c2 .7 3 2.4 3 4.6" /></>,
  wind: <><path d="M3 8h11.5a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 12h16a2 2 0 1 1-2 2" /><path d="M3 16h7.5a2.5 2.5 0 1 1-2.5 2.5" /></>,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
