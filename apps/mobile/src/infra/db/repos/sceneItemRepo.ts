import { run, getAll } from '@infra/db/db';
import type { SceneItem, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// DB row → domain type
//
// Column mapping:
//   pos_x  → x  (horizontal, used in both views)
//   pos_y  → y  (height, used in elevation view)
//   pos_z  → z  (depth, used in top view)
// ─────────────────────────────────────────────

interface SceneItemRow {
  id: string;
  type: string;
  label: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  state: string;
  created_at: number;
  updated_at: number;
}

function fromRow(row: SceneItemRow): SceneItem {
  return {
    id:         row.id,
    type:       row.type as SceneItem['type'],
    label:      row.label,
    x:          row.pos_x,
    y:          row.pos_y,
    z:          row.pos_z ?? 0.5, // backward compat: pre-V3 rows have no pos_z
    state:      row.state as SceneItemState,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────

export async function getAllSceneItems(): Promise<SceneItem[]> {
  const rows = await getAll<SceneItemRow>(
    'SELECT * FROM scene_equipment ORDER BY created_at ASC',
  );
  return rows.map(fromRow);
}

export async function insertSceneItem(item: SceneItem): Promise<void> {
  await run(
    `INSERT INTO scene_equipment (id, type, label, pos_x, pos_y, pos_z, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.type, item.label, item.x, item.y, item.z, item.state, item.created_at, item.updated_at],
  );
}

/** Top view drag: updates x (horizontal) and z (depth). Height y is unchanged. */
export async function updateSceneItemPositionTopView(
  id: string,
  x: number,
  z: number,
  updatedAt: number,
): Promise<void> {
  await run(
    'UPDATE scene_equipment SET pos_x = ?, pos_z = ?, updated_at = ? WHERE id = ?',
    [x, z, updatedAt, id],
  );
}

/** Elevation view drag: updates x (horizontal) and y (height). Depth z is unchanged. */
export async function updateSceneItemPositionElevation(
  id: string,
  x: number,
  y: number,
  updatedAt: number,
): Promise<void> {
  await run(
    'UPDATE scene_equipment SET pos_x = ?, pos_y = ?, updated_at = ? WHERE id = ?',
    [x, y, updatedAt, id],
  );
}

export async function updateSceneItemInfo(
  id: string,
  label: string,
  state: SceneItemState,
  updatedAt: number,
): Promise<void> {
  await run(
    'UPDATE scene_equipment SET label = ?, state = ?, updated_at = ? WHERE id = ?',
    [label, state, updatedAt, id],
  );
}

export async function deleteSceneItem(id: string): Promise<void> {
  await run('DELETE FROM scene_equipment WHERE id = ?', [id]);
}
