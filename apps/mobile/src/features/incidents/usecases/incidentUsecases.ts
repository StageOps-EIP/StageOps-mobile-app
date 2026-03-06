import { insertIncident } from '@infra/db/repos/incidentRepo';
import { enqueue } from '@infra/db/repos/outboxRepo';
import { getDeviceId } from '@infra/sync/device';
import { maybeSync } from '@infra/sync/syncEngine';
import { uuid } from '@shared/ids';
import type { Incident, IncidentSeverity } from '@shared/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateIncidentInput {
  title: string;
  severity: IncidentSeverity;
  description: string;
  /** Optional — passed when reporting from an equipment details screen. */
  equipment_id?: string;
}

// ─────────────────────────────────────────────
// Use-case
// ─────────────────────────────────────────────

/**
 * Creates an incident locally and enqueues an outbox event for sync.
 *
 * Steps:
 *  1. Build incident row with a fresh UUID, status=OPEN, timestamps=now.
 *  2. Insert into local SQLite via `insertIncident`.
 *  3. Enqueue INCIDENT_CREATE outbox event with all incident fields.
 *  4. Fire-and-forget `maybeSync()`.
 *
 * Returns the newly created Incident.
 */
export async function createIncident(
  input: CreateIncidentInput,
): Promise<Incident> {
  const now = Date.now();
  const deviceId = await getDeviceId();

  const incident: Incident = {
    id: uuid(),
    equipment_id: input.equipment_id?.trim() || null,
    title: input.title.trim(),
    severity: input.severity,
    status: 'OPEN',
    description: input.description.trim() || null,
    created_by: deviceId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  // 1. Persist locally — fails loudly if id already exists
  await insertIncident(incident);

  // 2. Enqueue for sync
  await enqueue({
    event_id: uuid(),
    device_id: deviceId,
    type: 'INCIDENT_CREATE',
    payload_json: JSON.stringify({
      id: incident.id,
      equipment_id: incident.equipment_id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      description: incident.description,
      created_by: incident.created_by,
      created_at: incident.created_at,
      updated_at: incident.updated_at,
    }),
    created_at: now,
    status: 'PENDING',
    last_error: null,
    attempt_count: 0,
  });

  // 3. Opportunistic sync
  void maybeSync();

  return incident;
}

