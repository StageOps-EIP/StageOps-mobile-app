import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { backoffMs } from './backoff';
import { SYNC_BACKOFF_BASE_MS, SYNC_BACKOFF_MAX_MS } from '@shared/constants';

describe('backoffMs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 0 when the random draw is 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(backoffMs(3)).toBe(0);
  });

  it('doubles the ceiling after each failure', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoffMs(0)).toBe(SYNC_BACKOFF_BASE_MS / 2);
    expect(backoffMs(1)).toBe(SYNC_BACKOFF_BASE_MS);
    expect(backoffMs(2)).toBe(SYNC_BACKOFF_BASE_MS * 2);
  });

  it('never exceeds the maximum delay', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(backoffMs(50)).toBeLessThan(SYNC_BACKOFF_MAX_MS);
    expect(backoffMs(50)).toBeGreaterThan(SYNC_BACKOFF_MAX_MS * 0.99);
  });
});
