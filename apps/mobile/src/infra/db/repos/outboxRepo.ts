import { run, getAll } from '@infra/db/db';
import type { OutboxEvent } from '@shared/types';
import { SYNC_MAX_EVENT_ATTEMPTS } from '@shared/constants';

// ─────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────

/**
 * Returns PENDING outbox events ordered by creation time (oldest first).
 * Excludes events that have already exceeded the max attempt threshold.
 *
 * @param limit  Maximum number of events to return (default: no limit).
 */
export async function getPendingEvents(
  limit = 1_000,
): Promise<OutboxEvent[]> {
  return getAll<OutboxEvent>(
    `SELECT * FROM outbox_events
      WHERE status = 'PENDING'
        AND attempt_count < ?
      ORDER BY created_at ASC
      LIMIT ?`,
    [SYNC_MAX_EVENT_ATTEMPTS, limit],
  );
}

/**
 * Returns all events regardless of status — useful for the SyncQueue screen.
 */
export async function getAllEvents(): Promise<OutboxEvent[]> {
  return getAll<OutboxEvent>(
    `SELECT * FROM outbox_events ORDER BY created_at DESC`,
  );
}

// ─────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────

/**
 * Adds a new outbox event with status PENDING.
 */
export async function enqueue(event: OutboxEvent): Promise<void> {
  await run(
    `INSERT INTO outbox_events
       (event_id, device_id, type, payload_json, created_at, status, last_error, attempt_count)
     VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, 0)`,
    [
      event.event_id,
      event.device_id,
      event.type,
      event.payload_json,
      event.created_at,
    ],
  );
}

/**
 * Marks an event as SENT and increments the attempt counter.
 */
export async function markSent(eventId: string): Promise<void> {
  await run(
    `UPDATE outbox_events
        SET status = 'SENT', last_error = NULL, attempt_count = attempt_count + 1
      WHERE event_id = ?`,
    [eventId],
  );
}

/**
 * Records a failed attempt.
 * - If attempt_count + 1 >= SYNC_MAX_EVENT_ATTEMPTS the status becomes FAILED.
 * - Otherwise it stays PENDING so it will be retried on the next sync.
 */
export async function markFailed(
  eventId: string,
  error: string,
): Promise<void> {
  await run(
    `UPDATE outbox_events
        SET attempt_count = attempt_count + 1,
            last_error    = ?,
            status        = CASE
                              WHEN attempt_count + 1 >= ? THEN 'FAILED'
                              ELSE 'PENDING'
                            END
      WHERE event_id = ?`,
    [error, SYNC_MAX_EVENT_ATTEMPTS, eventId],
  );
}

/**
 * Resets a FAILED event back to PENDING with zeroed attempt_count.
 * Useful for a manual "retry" action in the UI.
 */
export async function resetEvent(eventId: string): Promise<void> {
  await run(
    `UPDATE outbox_events
        SET status = 'PENDING', attempt_count = 0, last_error = NULL
      WHERE event_id = ? AND status = 'FAILED'`,
    [eventId],
  );
}

