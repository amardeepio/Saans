/**
 * Shared JSON fetch helper for client components.
 *
 * Combines a caller's cancellation signal with a timeout, rejects on a
 * non-2xx response, and returns the parsed body. Keeping this in one place
 * means every screen handles slow networks the same way.
 */

import { CLIENT_TIMEOUT_MS } from "./constants";

export interface FetchJsonOptions extends Omit<RequestInit, "signal"> {
  /** Per-request budget. Defaults to the air-reading budget. */
  timeoutMs?: number;
  /** Optional caller signal, merged with the timeout. */
  signal?: AbortSignal;
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function requestSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = CLIENT_TIMEOUT_MS.air, signal, ...init } = options;
  const response = await fetch(url, { ...init, signal: requestSignal(signal, timeoutMs) });
  if (!response.ok) throw new HttpError(response.status);
  return (await response.json()) as T;
}
