import {
  listEquipment,
  getEquipmentById,
  upsertEquipment,
  type EquipmentFilter,
} from '@infra/db/repos/equipmentRepo';
import { enqueue } from '@infra/db/repos/outboxRepo';
import { getDeviceId } from '@infra/sync/device';
import { maybeSync } from '@infra/sync/syncEngine';
import { uuid } from '@shared/ids';
import type { Equipment, EquipmentStatus, EquipmentCategory } from '@shared/types';

// ─────────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────────

export type { EquipmentFilter };

export interface InventoryFilter {
  search: string;
  status: EquipmentStatus | null;
  category: EquipmentCategory | null;
}

export const EMPTY_FILTER: InventoryFilter = {
  search: '',
  status: null,
  category: null,
};

// ─────────────────────────────────────────────
// Read use-cases
// ─────────────────────────────────────────────

/**
 * Returns equipment matching the given filter.
 * All reads are local-only — no network required.
 */
export async function getFilteredEquipment(
  filter: InventoryFilter,
): Promise<Equipment[]> {
  return listEquipment({
    search: filter.search || undefined,
    status: filter.status ?? undefined,
    category: filter.category ?? undefined,
  });
}

/**
 * Returns a single equipment item by id, or null if not found.
 */
export async function fetchEquipmentById(
  id: string,
): Promise<Equipment | null> {
  return getEquipmentById(id);
}

// ─────────────────────────────────────────────
// Write use-cases
// ─────────────────────────────────────────────

/**
 * Updates equipment status locally and enqueues an outbox event.
 * Triggers a background sync attempt when done.
 *
 * Steps:
 *  1. Read current row to get full equipment data.
 *  2. Write updated row to local DB (upsert, updated_at = now).
 *  3. Enqueue EQUIPMENT_UPDATE_STATUS outbox event.
 *  4. Fire-and-forget maybeSync() — sends if online.
 *
 * Returns the updated equipment row, or throws if not found.
 */
export async function updateEquipmentStatus(
  id: string,
  newStatus: EquipmentStatus,
): Promise<Equipment> {
  const existing = await getEquipmentById(id);
  if (!existing) throw new Error(`Equipment not found: ${id}`);

  const now = Date.now();
  const updated: Equipment = { ...existing, status: newStatus, updated_at: now };

  // 1. Persist locally
  await upsertEquipment(updated);

  // 2. Enqueue outbox event for sync
  const deviceId = await getDeviceId();
  await enqueue({
    event_id: uuid(),
    device_id: deviceId,
    type: 'EQUIPMENT_UPDATE_STATUS',
    payload_json: JSON.stringify({
      equipment_id: id,
      new_status: newStatus,
      updated_at: now,
    }),
    created_at: now,
    status: 'PENDING',
    last_error: null,
    attempt_count: 0,
  });

  // 3. Opportunistic sync (fire-and-forget)
  void maybeSync();

  return updated;
}
