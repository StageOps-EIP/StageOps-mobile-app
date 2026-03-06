import { getFirst, run } from '../db';
import type { SyncState } from '@shared/types';

// ─────────────────────────────────────────────
// Generic key/value helpers
// ─────────────────────────────────────────────

export async function getSyncValue(key: string): Promise<string | null> {
  const row = await getFirst<SyncState>(
    'SELECT value FROM sync_state WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSyncValue(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO sync_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE
       SET value = excluded.value,
           updated_at = excluded.updated_at`,
    [key, value, Date.now()],
  );
}

// ─────────────────────────────────────────────
// Sync-specific keys
// ─────────────────────────────────────────────

const KEY_CURSOR = 'cursor';
const KEY_LAST_SYNC = 'last_sync_at';

/** Returns the pull cursor, or null if never synced. */
export async function getCursor(): Promise<string | null> {
  return getSyncValue(KEY_CURSOR);
}

export async function setCursor(cursor: string): Promise<void> {
  return setSyncValue(KEY_CURSOR, cursor);
}

/** Returns last successful sync timestamp (epoch ms) or null. */
export async function getLastSyncAt(): Promise<number | null> {
  const v = await getSyncValue(KEY_LAST_SYNC);
  return v ? parseInt(v, 10) : null;
}

export async function setLastSyncAt(ts: number): Promise<void> {
  return setSyncValue(KEY_LAST_SYNC, String(ts));
}

