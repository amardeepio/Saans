/**
 * Small, fail-safe wrapper around `localStorage`.
 *
 * Private browsing, disabled storage and corrupted JSON should never break a
 * session, so every read falls back to the caller's default and every write
 * reports whether it landed instead of throwing.
 */

export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Removing a key is best-effort; a blocked store is already unusable.
  }
}

/**
 * Parses a raw stored string in one step. `parse` is responsible for
 * validating the shape and returning `null` when the payload is not usable.
 */
export function parseStoredJson<T>(
  raw: string | null,
  parse: (value: unknown) => T | null,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    return parse(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Reads and parses a stored JSON value in one step. */
export function readStoredJson<T>(
  key: string,
  parse: (value: unknown) => T | null,
  fallback: T,
): T {
  return parseStoredJson(readStorage(key), parse, fallback);
}

export function writeStoredJson(key: string, value: unknown): boolean {
  return writeStorage(key, JSON.stringify(value));
}
