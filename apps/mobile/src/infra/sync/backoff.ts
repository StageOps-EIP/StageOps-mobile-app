import { SYNC_BACKOFF_BASE_MS, SYNC_BACKOFF_MAX_MS } from '@shared/constants';

/**
 * Computes the next retry delay using full-jitter exponential backoff:
 *   delay = rand(0, min(MAX, BASE * 2^n))
 */
export function backoffMs(failures: number): number {
  const cap = Math.min(SYNC_BACKOFF_MAX_MS, SYNC_BACKOFF_BASE_MS * Math.pow(2, failures));
  return Math.floor(Math.random() * cap);
}
