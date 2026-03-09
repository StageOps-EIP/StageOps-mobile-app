import { run, getAll } from '@infra/db/db';
import type { SceneItem, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// DB row → domain type
// The table uses pos_x/pos_y columns; we map them to x/y.
// ─────────────────────────────────────────────

interface SceneItemRow {
  id: string;
  type: string;
  label: string;
  pos_x: number;
  pos_y: number;
  state: string;
  created_at: number;
  updated_at: number;
}

function fromRow(row: SceneItemRow): SceneItem {
  return {
    id: row.id,
    type: row.type as SceneItem['type'],
    label: row.label,
    x: row.pos_x,
    y: row.pos_y,
    state: row.state as SceneItemState,
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
    `INSERT INTO scene_equipment (id, type, label, pos_x, pos_y, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.type, item.label, item.x, item.y, item.state, item.created_at, item.updated_at],
  );
}

export async function updateSceneItemPosition(
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
