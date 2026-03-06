import { run, getAll, getFirst } from '@infra/db/db';
import type { Incident } from '@shared/types';

// ─────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────

/** Returns all non-deleted incidents, newest first. */
export async function getAllIncidents(): Promise<Incident[]> {
  return getAll<Incident>(
    `SELECT * FROM incidents WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  );
}

/**
 * Returns the `limit` most recent incidents from the last 24 h.
 * Used by the dashboard to surface activity at a glance.
 */
export async function listRecentIncidents(limit: number): Promise<Incident[]> {
  const since = Date.now() - 24 * 60 * 60 * 1_000;
  return getAll<Incident>(
    `SELECT * FROM incidents
      WHERE deleted_at IS NULL
        AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [since, limit],
  );
}

/** Returns a single incident row or null. */
export async function getIncidentById(id: string): Promise<Incident | null> {
  return getFirst<Incident>(
    `SELECT * FROM incidents WHERE id = ?`,
    [id],
  );
}

// ─────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────

/**
 * Insert a brand new incident (local creation flow).
 * Fails loudly on duplicate id — use {@link upsertIncident} for sync deltas.
 */
export async function insertIncident(inc: Incident): Promise<void> {
  await run(
    `INSERT INTO incidents
       (id, equipment_id, title, severity, status,
        description, created_by, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inc.id,
      inc.equipment_id ?? null,
      inc.title,
      inc.severity,
      inc.status,
      inc.description ?? null,
      inc.created_by ?? null,
      inc.created_at,
      inc.updated_at,
      inc.deleted_at ?? null,
    ],
  );
}

/**
 * Insert or replace an incident row.
 * Used by incoming sync deltas — "last write wins" on `updated_at`.
 */
export async function upsertIncident(inc: Incident): Promise<void> {
  await run(
    `INSERT INTO incidents
       (id, equipment_id, title, severity, status,
        description, created_by, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       equipment_id = excluded.equipment_id,
       title        = excluded.title,
       severity     = excluded.severity,
       status       = excluded.status,
       description  = excluded.description,
       created_by   = excluded.created_by,
       updated_at   = excluded.updated_at,
       deleted_at   = excluded.deleted_at
     WHERE excluded.updated_at >= incidents.updated_at`,
    [
      inc.id,
      inc.equipment_id ?? null,
      inc.title,
      inc.severity,
      inc.status,
      inc.description ?? null,
      inc.created_by ?? null,
      inc.created_at,
      inc.updated_at,
      inc.deleted_at ?? null,
    ],
  );
}

/**
 * Soft-delete: sets deleted_at to the given timestamp.
 */
export async function softDeleteIncident(
  id: string,
  deletedAt: number,
): Promise<void> {
  await run(
    `UPDATE incidents SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    [deletedAt, deletedAt, id],
  );
}

