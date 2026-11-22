/** Small helpers for the shareable `?city=` dashboard parameter. */

export function requestedCityId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("city");
}

/** Keeps the address bar shareable without turning the route dynamic. */
export function syncCityParam(id: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("city") === id) return;
  url.searchParams.set("city", id);
  window.history.replaceState(null, "", url);
}

export function pickCity<T extends { city: { id: string } }>(items: T[], id: string | null) {
  if (!id) return undefined;
  return items.find((item) => item.city.id === id);
}
