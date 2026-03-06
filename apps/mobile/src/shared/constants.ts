// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

/**
 * Backend base URL. Override via EXPO_PUBLIC_API_URL in .env.
 * No trailing slash.
 */
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** Default request timeout (ms). */
export const HTTP_TIMEOUT_MS = 15_000;

// ─────────────────────────────────────────────
// Sync
// ─────────────────────────────────────────────

/** Maximum number of outbox events pushed per batch. */
export const SYNC_BATCH_SIZE = 50;

/** Maximum per-event push retry attempts before marking it FAILED. */
export const SYNC_MAX_EVENT_ATTEMPTS = 5;

/** Base delay for exponential backoff (ms). */
export const SYNC_BACKOFF_BASE_MS = 2_000;

/** Ceiling for backoff delay (ms). */
export const SYNC_BACKOFF_MAX_MS = 5 * 60_000; // 5 min

