import { HTTP_TIMEOUT_MS } from '@shared/constants';
import { log } from '@infra/logging/log';

const TAG = 'HTTP';

// ─────────────────────────────────────────────
// Error types
// ─────────────────────────────────────────────

/**
 * Raised when the server returns a non-2xx status.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    url: string,
  ) {
    super(`HTTP ${status} at ${url}`);
    this.name = 'HttpError';
  }
}

/**
 * Raised when the request times out.
 */
export class HttpTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'HttpTimeoutError';
  }
}

// ─────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────

interface FetchOptions extends Omit<RequestInit, 'signal'> {
  /** Request timeout in ms. Defaults to HTTP_TIMEOUT_MS. */
  timeoutMs?: number;
}

async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { timeoutMs = HTTP_TIMEOUT_MS, ...init } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  try {
    log.debug(TAG, `→ ${init.method ?? 'GET'} ${url}`);

    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...init.headers,
      },
    });

    const elapsed = Date.now() - start;
    log.debug(TAG, `← ${res.status} ${url} (${elapsed}ms)`);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HttpError(res.status, body, url);
    }

    // 204 No Content → return empty object
    if (res.status === 204) return {} as T;

    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new HttpTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
// Public helpers
// ─────────────────────────────────────────────

export async function get<T>(url: string, options?: FetchOptions): Promise<T> {
  return fetchJson<T>(url, { ...options, method: 'GET' });
}

export async function post<T>(
  url: string,
  body: unknown,
  options?: FetchOptions,
): Promise<T> {
  return fetchJson<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

