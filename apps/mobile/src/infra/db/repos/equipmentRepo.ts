import { run, getAll, getFirst } from '@infra/db/db';
import type { Equipment, EquipmentStatus, EquipmentCategory } from '@shared/types';

// ─────────────────────────────────────────────
// Filter type
// ─────────────────────────────────────────────

export interface EquipmentFilter {
  search?: string;
  status?: EquipmentStatus | null;
  category?: EquipmentCategory | null;
}

// ─────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────

/** Returns all equipment rows that haven't been soft-deleted. */
export async function getAllEquipment(): Promise<Equipment[]> {
  return getAll<Equipment>(
    `SELECT * FROM equipment WHERE deleted_at IS NULL ORDER BY name ASC`,
  );
}

/**
 * Returns equipment filtered by optional search text, status and category.
 * All filtering is done in SQL for efficiency.
 */
export async function listEquipment(
  filter: EquipmentFilter = {},
): Promise<Equipment[]> {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (filter.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter.category) {
    conditions.push('category = ?');
    params.push(filter.category);
  }
  if (filter.search && filter.search.trim().length > 0) {
    conditions.push('(name LIKE ? OR location LIKE ? OR responsible_name LIKE ?)');
    const term = `%${filter.search.trim()}%`;
    params.push(term, term, term);
  }

  return getAll<Equipment>(
    `SELECT * FROM equipment WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
    params,
  );
}

/** Returns a single equipment row or null. */
export async function getEquipmentById(id: string): Promise<Equipment | null> {
  return getFirst<Equipment>(
    `SELECT * FROM equipment WHERE id = ?`,
    [id],
  );
}

// ─────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────

/**
 * Insert or replace an equipment row.
 * Used by both local edits and incoming sync deltas.
 * Conflict is resolved by "last write wins" on `updated_at`.
 */
export async function upsertEquipment(eq: Equipment): Promise<void> {
  await run(
    `INSERT INTO equipment
       (id, name, category, qr_code, location, status,
        responsible_name, last_check_at, notes, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name             = excluded.name,
       category         = excluded.category,
       qr_code          = excluded.qr_code,
       location         = excluded.location,
       status           = excluded.status,
       responsible_name = excluded.responsible_name,
       last_check_at    = excluded.last_check_at,
       notes            = excluded.notes,
       updated_at       = excluded.updated_at,
       deleted_at       = excluded.deleted_at
     WHERE excluded.updated_at >= equipment.updated_at`,
    [
      eq.id,
      eq.name,
      eq.category,
      eq.qr_code,
      eq.location,
      eq.status,
      eq.responsible_name ?? null,
      eq.last_check_at ?? null,
      eq.notes ?? null,
      eq.updated_at,
      eq.deleted_at ?? null,
    ],
  );
}

/**
 * Soft-delete: sets deleted_at to the given timestamp.
 * Does not remove the row so that outbox events can still reference it.
 */
export async function softDeleteEquipment(
  id: string,
  deletedAt: number,
): Promise<void> {
  await run(
    `UPDATE equipment SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    [deletedAt, deletedAt, id],
  );
}

