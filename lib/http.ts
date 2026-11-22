/** Shared HTTP helpers for Next.js API route handlers. */

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  error: string,
  extraBody?: Record<string, unknown>,
  options?: { noStore?: boolean },
): Response {
  const headers: Record<string, string> = {
    "Retry-After": String(retryAfterSeconds),
  };
  if (options?.noStore) {
    headers["Cache-Control"] = "no-store";
  }
  return Response.json({ error, ...extraBody }, { status: 429, headers });
}

export type BoundedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function readBoundedJson<T>(
  request: Request,
  maxBytes: number,
  extraErrorBody?: Record<string, unknown>,
): Promise<BoundedJsonResult<T>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) {
    return {
      ok: false,
      response: Response.json(
        { error: "Request is too large.", ...extraErrorBody },
        { status: 413 },
      ),
    };
  }

  try {
    const raw = await request.text();
    if (raw.length > maxBytes) {
      return {
        ok: false,
        response: Response.json(
          { error: "Request is too large.", ...extraErrorBody },
          { status: 413 },
        ),
      };
    }
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid request.", ...extraErrorBody },
        { status: 400 },
      ),
    };
  }
}
