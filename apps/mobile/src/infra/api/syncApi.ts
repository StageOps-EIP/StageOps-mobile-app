import { get, post } from './httpClient';
import { API_BASE_URL } from '@shared/constants';
import type {
  OutboxEvent,
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
} from '@shared/types';

// ─────────────────────────────────────────────
// Push
// ─────────────────────────────────────────────

/**
 * POST /sync/push
 *
 * Sends a batch of pending outbox events to the server.
 * Returns per-event acknowledgements.
 */
export async function pushEvents(
  deviceId: string,
  events: OutboxEvent[],
): Promise<SyncPushResponse> {
  const body: SyncPushRequest = {
    device_id: deviceId,
    events: events.map((e) => ({
      event_id: e.event_id,
      type: e.type,
      created_at: e.created_at,
      payload: JSON.parse(e.payload_json) as Record<string, unknown>,
    })),
  };

  return post<SyncPushResponse>(`${API_BASE_URL}/sync/push`, body);
}

// ─────────────────────────────────────────────
// Pull
// ─────────────────────────────────────────────

/**
 * GET /sync/pull?cursor=...
 *
 * Fetches all changes the server has seen since the given cursor.
 * The server returns a new `next_cursor` to persist locally.
 */
export async function pullDeltas(
  cursor: string,
): Promise<SyncPullResponse> {
  const params = new URLSearchParams({ cursor });
  return get<SyncPullResponse>(`${API_BASE_URL}/sync/pull?${params.toString()}`);
}

