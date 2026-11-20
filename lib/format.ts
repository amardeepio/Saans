export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatInr(value: number): string {
  const absolute = Math.abs(Math.round(value));
  return `₹${formatNumber(absolute)}`;
}

export function formatObservedAt(value: string): string {
  const hourMatch = value.match(/T(\d{2}):(\d{2})/);
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    const minute = hourMatch[2];
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${minute} ${suffix} local`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function relativeFreshness(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently updated";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 2) return "updated just now";
  if (minutes < 60) return `updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `updated ${hours} hr ago`;
  return "forecast snapshot";
}
