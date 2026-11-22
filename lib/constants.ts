/** Shared limits and timeouts used by client components and API calls. */

/** Longest question the assistant accepts, in characters. */
export const CHAT_INPUT_MAX = 600;

/** How many city readings the offline cache keeps. */
export const OFFLINE_CACHE_MAX_CITIES = 8;

/** Client-side request budgets. Keep them named so the intent is obvious. */
export const CLIENT_TIMEOUT_MS = {
  air: 12_000,
  geocode: 12_000,
  ranking: 15_000,
  translate: 20_000,
  chat: 22_000,
} as const;
