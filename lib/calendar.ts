function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** ICS floating local time. Avoids timezone-offset bugs for a local plan. */
function icsDate(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    pad(date.getMinutes()),
    "00",
  ].join("");
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export interface CalendarEvent {
  title: string;
  description: string;
  start: string;
  end?: string;
  durationMinutes?: number;
  location?: string;
}

export function buildIcs(event: CalendarEvent): string | null {
  const start = parseDate(event.start);
  if (!start) return null;
  const end = event.end
    ? parseDate(event.end)
    : new Date(start.getTime() + (event.durationMinutes ?? 30) * 60_000);
  if (!end) return null;

  const now = new Date();
  const uid = `saans-${start.getTime()}@saans.local`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saans//Air plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsDate(now)}Z`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadIcs(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function cleanWindowEvent(options: {
  city: string;
  label: string;
  start: string;
  end: string;
  aqi: number;
  scale: string;
}): CalendarEvent {
  return {
    title: `Saans: cleaner air window in ${options.city}`,
    description: `The cleanest two-hour window is ${options.label}. Estimated ${options.scale} ${options.aqi}. Check Saans before you go outside; this is a planning aid, not a guarantee.`,
    start: options.start,
    end: options.end,
    location: options.city,
  };
}
