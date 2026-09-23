const DEFAULT_FETCH_TIMEOUT_MS = 45_000;

/** Edge isolate dies if a single sleep waits out the wall clock. */
export const MAX_RETRY_AFTER_MS = 60_000;

export class PermanentHttpError extends Error {
  readonly permanent = true;

  constructor(message: string) {
    super(message);
    this.name = "PermanentHttpError";
  }
}

export class RetryableHttpError extends Error {
  readonly retryAfterMs: number | null;

  constructor(message: string, retryAfterMs: number | null) {
    super(message);
    this.name = "RetryableHttpError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function parseRetryAfterMs(header: string | null, now = Date.now()): number | null {
  if (header == null || header.trim() === "") return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0 && /^\d+(\.\d+)?$/.test(header.trim())) {
    return Math.round(seconds * 1000);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - now);
  return null;
}

export function retryDelayMs(error: unknown, attempt: number, baseDelayMs: number): number {
  if (error instanceof RetryableHttpError && error.retryAfterMs != null) {
    return Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);
  }
  return baseDelayMs * attempt;
}

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  return await fetch(input, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof PermanentHttpError) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        const delay = retryDelayMs(error, attempt, baseDelayMs);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }
  throw lastError!;
}
