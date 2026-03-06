import NetInfo from '@react-native-community/netinfo';

import { log } from '@infra/logging/log';
import { pushEvents, pullDeltas } from '@infra/api/syncApi';
import { getPendingEvents, markSent, markFailed } from '@infra/db/repos/outboxRepo';
import { upsertEquipment } from '@infra/db/repos/equipmentRepo';
import { upsertIncident } from '@infra/db/repos/incidentRepo';
import { getCursor, setCursor, setLastSyncAt } from '@infra/db/repos/syncStateRepo';
import { getDeviceId } from './device';
import {
  SYNC_BATCH_SIZE,
  SYNC_BACKOFF_BASE_MS,
  SYNC_BACKOFF_MAX_MS,
} from '@shared/constants';
import type { Equipment, Incident, SyncChange } from '@shared/types';

const TAG = 'SyncEngine';

// ─────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────

let _running = false;
let _failureCount = 0;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;

// ─────────────────────────────────────────────
// Backoff helpers
// ─────────────────────────────────────────────

/**
 * Computes the next retry delay using full-jitter exponential backoff:
 *   delay = rand(0, min(MAX, BASE * 2^n))
 */
function backoffMs(failures: number): number {
  const cap = Math.min(
    SYNC_BACKOFF_MAX_MS,
    SYNC_BACKOFF_BASE_MS * Math.pow(2, failures),
  );
  return Math.floor(Math.random() * cap);
}

function cancelRetryTimer(): void {
  if (_retryTimer !== null) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
}

function scheduleRetry(): void {
  cancelRetryTimer();
  const delay = backoffMs(_failureCount);
  log.warn(TAG, `Scheduling retry in ${delay}ms (failures=${_failureCount})`);
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    void maybeSync();
  }, delay);
}

function resetBackoff(): void {
  _failureCount = 0;
  cancelRetryTimer();
}

// ─────────────────────────────────────────────
// Delta application
// ─────────────────────────────────────────────

/**
 * Applies a list of server-side changes to the local SQLite database.
 * Each change targets either the `equipment` or `incidents` table.
 * Soft-deletes are represented as upserts with a non-null `deleted_at`.
 */
async function applyDeltas(changes: SyncChange[]): Promise<void> {
  for (const change of changes) {
    try {
      if (change.entity === 'equipment' && change.op === 'upsert') {
        await upsertEquipment(change.data as unknown as Equipment);
      } else if (change.entity === 'incidents' && change.op === 'upsert') {
        await upsertIncident(change.data as unknown as Incident);
      } else {
        // 'delete' ops are conveyed via soft-delete (deleted_at != null)
        // inside an upsert, so op='delete' here is a no-op guard.
        log.warn(TAG, `Unhandled change`, { entity: change.entity, op: change.op });
      }
    } catch (err) {
      // Log but continue — one bad row must not abort the whole batch.
      log.error(TAG, `applyDelta failed`, { change, err });
    }
  }
}

// ─────────────────────────────────────────────
// Core sync cycle
// ─────────────────────────────────────────────

/**
 * Performs a complete sync cycle:
 *  1. Push pending outbox events in a single batch.
 *  2. Mark each event SENT or FAILED based on server acks.
 *  3. Pull server deltas from the stored cursor.
 *  4. Apply deltas locally.
 *  5. Persist the new cursor and last_sync_at timestamp.
 */
export async function syncNow(): Promise<void> {
  log.info(TAG, 'syncNow: started');

  // ── 1. Push ──────────────────────────────────
  const pending = await getPendingEvents(SYNC_BATCH_SIZE);
  log.info(TAG, `Push: ${pending.length} pending event(s)`);

  if (pending.length > 0) {
    const deviceId = await getDeviceId();
    const { acks } = await pushEvents(deviceId, pending);

    // ── 2. Process acks ──────────────────────────
    const ackMap = new Map(acks.map((a) => [a.event_id, a]));

    for (const event of pending) {
      const ack = ackMap.get(event.event_id);
      if (ack?.ok) {
        await markSent(event.event_id);
      } else {
        // Server explicitly rejected it, or no ack returned (treat as failure)
        const reason = ack?.error ?? 'no ack received';
        await markFailed(event.event_id, reason);
        log.warn(TAG, `Event ${event.event_id} failed: ${reason}`);
      }
    }
  }

  // ── 3. Pull ──────────────────────────────────
  const cursor = (await getCursor()) ?? '';
  log.info(TAG, `Pull: cursor=${cursor || '(empty)'}`);

  const { next_cursor, changes } = await pullDeltas(cursor);
  log.info(TAG, `Pull: received ${changes.length} change(s), next_cursor=${next_cursor}`);

  // ── 4. Apply deltas ───────────────────────────
  if (changes.length > 0) {
    await applyDeltas(changes);
  }

  // ── 5. Persist state ──────────────────────────
  await setCursor(next_cursor);
  await setLastSyncAt(Date.now());

  log.info(TAG, 'syncNow: completed');
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Triggers a sync cycle if:
 *  - A sync is not already in progress, AND
 *  - The device is currently online.
 *
 * On success the backoff counter is reset.
 * On failure the counter is incremented and a retry is scheduled.
 */
export async function maybeSync(): Promise<void> {
  if (_running) {
    log.debug(TAG, 'maybeSync: already running, skipped');
    return;
  }

  const net = await NetInfo.fetch();
  if (!net.isConnected || !net.isInternetReachable) {
    log.debug(TAG, 'maybeSync: offline, skipped');
    return;
  }

  _running = true;
  try {
    await syncNow();
    resetBackoff();
  } catch (err) {
    _failureCount += 1;
    log.error(TAG, `syncNow failed (attempt #${_failureCount})`, err);
    scheduleRetry();
  } finally {
    _running = false;
  }
}

/**
 * Returns true if a sync is currently in progress.
 * Useful for showing a loading indicator in the UI.
 */
export function isSyncing(): boolean {
  return _running;
}

