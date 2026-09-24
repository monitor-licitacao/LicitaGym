const DEFAULT_FETCH_TIMEOUT_MS = 45_000;

/** Soft deadline inside the ~150s Edge isolate wall clock. */
export const EDGE_REQUEST_DEADLINE_MS = 110_000;

/** Leave headroom so the isolate can still serialize the error response. */
export const RETRY_MARGIN_MS = 2_000;

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

/**
 * HTTP 200 with empty body — anomaly, not valid empty.
 * Retryable once; second occurrence becomes PermanentHttpError.
 */
export class EmptyBodyAnomalyError extends RetryableHttpError {
  constructor() {
    super("PNCP consulta empty body anomaly (HTTP 200)", null);
    this.name = "EmptyBodyAnomalyError";
  }
}

/** No time left for another full attempt inside the Edge deadline. */
export class BudgetExhaustedError extends Error {
  constructor(message = "BUDGET_EXHAUSTED") {
    super(message);
    this.name = "BudgetExhaustedError";
  }
}

export type RequestBudget = {
  readonly deadlineAt: number;
  remainingMs: (now?: number) => number;
  /** Per-attempt timeout: min(cap, remaining − margin). 0 → do not start. */
  attemptTimeoutMs: (cap?: number, now?: number) => number;
};

export function createRequestBudget(
  deadlineMs = EDGE_REQUEST_DEADLINE_MS,
  now = Date.now(),
): RequestBudget {
  const deadlineAt = now + deadlineMs;
  return {
    deadlineAt,
    remainingMs(at = Date.now()) {
      return Math.max(0, deadlineAt - at);
    },
    attemptTimeoutMs(cap = DEFAULT_FETCH_TIMEOUT_MS, at = Date.now()) {
      const available = deadlineAt - at - RETRY_MARGIN_MS;
      if (available <= 0) return 0;
      return Math.min(cap, available);
    },
  };
}

export function parseRetryAfterMs(
  header: string | null,
  now = Date.now(),
): number | null {
  if (header == null || header.trim() === "") return null;
  const seconds = Number(header);
  if (
    Number.isFinite(seconds) && seconds >= 0 &&
    /^\d+(\.\d+)?$/.test(header.trim())
  ) {
    return Math.round(seconds * 1000);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - now);
  return null;
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "TimeoutError" || error.name === "AbortError";
  }
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return true;
    }
    if (/timeout/i.test(error.message)) return true;
  }
  return false;
}

/** Exponential backoff 1s, 2s, 4s… plus up to 25% jitter (capped). */
export function retryDelayWithJitter(
  attempt: number,
  baseDelayMs: number,
  random: () => number = Math.random,
): number {
  const exp = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = Math.floor(random() * Math.min(exp * 0.25, 250));
  return Math.min(exp + jitter, MAX_RETRY_AFTER_MS);
}

/** @deprecated Prefer retryDelayWithJitter; kept for Retry-After path. */
export function retryDelayMs(
  error: unknown,
  attempt: number,
  baseDelayMs: number,
): number {
  if (error instanceof RetryableHttpError && error.retryAfterMs != null) {
    return Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);
  }
  return retryDelayWithJitter(attempt, baseDelayMs);
}

/**
 * Fetch with a clearable abort timer (no AbortSignal.timeout leak).
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  if (timeoutMs <= 0) {
    throw new BudgetExhaustedError();
  }
  const controller = new AbortController();
  const external = init.signal;
  const onExternalAbort = () => {
    controller.abort(external?.reason);
  };
  if (external) {
    if (external.aborted) {
      throw external.reason instanceof Error
        ? external.reason
        : new DOMException("Aborted", "AbortError");
    }
    external.addEventListener("abort", onExternalAbort, { once: true });
  }
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  };
  const timer = setTimeout(() => {
    controller.abort(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );
  }, timeoutMs);
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    if (!response.body) {
      cleanup();
      return response;
    }

    const wrap = <T>(reader: () => Promise<T>) =>
      async (): Promise<T> => {
        try {
          return await reader();
        } finally {
          cleanup();
        }
      };

    const text = wrap(() => response.text());
    const json = wrap(() => response.json());
    const arrayBuffer = wrap(() => response.arrayBuffer());
    const blob = wrap(() => response.blob());
    const formData = wrap(() => response.formData());

    let wrappedBody: ReadableStream<Uint8Array> | null | undefined;
    const getWrappedBody = () => {
      if (wrappedBody !== undefined) return wrappedBody;
      const body = response.body;
      if (!body) {
        cleanup();
        wrappedBody = null;
        return wrappedBody;
      }
      const reader = body.getReader();
      wrappedBody = new ReadableStream<Uint8Array>({
        async pull(streamController) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              cleanup();
              streamController.close();
              return;
            }
            streamController.enqueue(value);
          } catch (error) {
            cleanup();
            streamController.error(error);
          }
        },
        async cancel(reason) {
          cleanup();
          await reader.cancel(reason);
        },
      });
      return wrappedBody;
    };

    return new Proxy(response, {
      get(target, prop, receiver) {
        if (prop === "text") return text;
        if (prop === "json") return json;
        if (prop === "arrayBuffer") return arrayBuffer;
        if (prop === "blob") return blob;
        if (prop === "formData") return formData;
        if (prop === "body") return getWrappedBody();
        return Reflect.get(target, prop, receiver);
      },
    }) as Response;
  } catch (error) {
    cleanup();
    throw error;
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type WithRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  budget?: RequestBudget;
  /** Extra attempts after a timeout (default 1 → at most 2 tries on timeout). */
  maxTimeoutRetries?: number;
  /** Extra attempts after empty-body anomaly (default 1). */
  maxEmptyBodyRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
};

function resolveOptions(
  maxAttemptsOrOptions: number | WithRetryOptions = 3,
  baseDelayMs = 1000,
):
  & Required<
    Pick<
      WithRetryOptions,
      "maxAttempts" | "baseDelayMs" | "maxTimeoutRetries" | "maxEmptyBodyRetries"
    >
  >
  & WithRetryOptions {
  if (typeof maxAttemptsOrOptions === "number") {
    return {
      maxAttempts: maxAttemptsOrOptions,
      baseDelayMs,
      maxTimeoutRetries: Math.max(0, maxAttemptsOrOptions - 1),
      maxEmptyBodyRetries: 1,
    };
  }
  return {
    maxAttempts: maxAttemptsOrOptions.maxAttempts ?? 3,
    baseDelayMs: maxAttemptsOrOptions.baseDelayMs ?? 1000,
    maxTimeoutRetries: maxAttemptsOrOptions.maxTimeoutRetries ?? 1,
    maxEmptyBodyRetries: maxAttemptsOrOptions.maxEmptyBodyRetries ?? 1,
    ...maxAttemptsOrOptions,
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttemptsOrOptions: number | WithRetryOptions = 3,
  baseDelayMs = 1000,
): Promise<T> {
  const options = resolveOptions(maxAttemptsOrOptions, baseDelayMs);
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const budget = options.budget;
  const maxAttempts = options.maxAttempts!;
  const maxTimeoutRetries = options.maxTimeoutRetries!;
  const maxEmptyBodyRetries = options.maxEmptyBodyRetries!;

  let lastError: Error | undefined;
  let timeoutRetries = 0;
  let emptyBodyRetries = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (
      budget && budget.attemptTimeoutMs(DEFAULT_FETCH_TIMEOUT_MS, now()) <= 0
    ) {
      throw new BudgetExhaustedError();
    }
    try {
      return await fn();
    } catch (error) {
      if (error instanceof PermanentHttpError) throw error;
      if (error instanceof BudgetExhaustedError) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));

      const timedOut = isTimeoutError(error);
      const emptyAnomaly = error instanceof EmptyBodyAnomalyError ||
        (error instanceof Error &&
          /empty body anomaly/i.test(error.message));

      if (timedOut) {
        if (timeoutRetries >= maxTimeoutRetries) {
          throw lastError;
        }
        timeoutRetries += 1;
      } else if (emptyAnomaly) {
        if (emptyBodyRetries >= maxEmptyBodyRetries) {
          throw new PermanentHttpError(
            "PNCP consulta empty body anomaly (HTTP 200) after retry",
          );
        }
        emptyBodyRetries += 1;
      }

      if (attempt >= maxAttempts) {
        if (emptyAnomaly) {
          throw new PermanentHttpError(
            "PNCP consulta empty body anomaly (HTTP 200) after retry",
          );
        }
        throw lastError;
      }

      let delay = 0;
      if (error instanceof RetryableHttpError && error.retryAfterMs != null) {
        delay = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);
      } else {
        delay = retryDelayWithJitter(attempt, options.baseDelayMs!, random);
      }

      if (budget) {
        const rem = budget.remainingMs(now());
        const nextAttemptCap = budget.attemptTimeoutMs(
          DEFAULT_FETCH_TIMEOUT_MS,
          now() + delay,
        );
        if (delay + Math.max(nextAttemptCap, 1) + RETRY_MARGIN_MS > rem) {
          throw new BudgetExhaustedError();
        }
        delay = Math.min(delay, Math.max(0, rem - RETRY_MARGIN_MS));
      }

      if (delay > 0) await sleep(delay);
    }
  }
  throw lastError!;
}

export { DEFAULT_FETCH_TIMEOUT_MS };
