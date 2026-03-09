import {
  getAllSceneItems,
  insertSceneItem,
  updateSceneItemPosition,
  updateSceneItemInfo,
  deleteSceneItem,
} from '@infra/db/repos/sceneItemRepo';
import { uuid } from '@shared/ids';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const DEFAULT_LABEL: Record<SceneItemType, string> = {
  light: 'Lumière',
  camera: 'Caméra',
  speaker: 'Enceinte',
};

// ─────────────────────────────────────────────
// Use-cases
// ─────────────────────────────────────────────

export async function loadItems(): Promise<SceneItem[]> {
  return getAllSceneItems();
}

/** Add a new item at the canvas center (0.5, 0.5). */
export async function addItem(type: SceneItemType): Promise<SceneItem> {
  const now = Date.now();
  const item: SceneItem = {
    id: uuid(),
    type,
    label: DEFAULT_LABEL[type],
    x: 0.5,
    y: 0.5,
    state: 'ok',
    created_at: now,
    updated_at: now,
  };
  await insertSceneItem(item);
  return item;
}

/** Persist the new position after a drag. */
export async function moveItem(id: string, x: number, y: number): Promise<void> {
  const clamp = (v: number) => Math.min(0.95, Math.max(0.05, v));
  await updateSceneItemPosition(id, clamp(x), clamp(y), Date.now());
}

/** Persist label and state changes from the edit sheet. */
export async function saveItemInfo(
  id: string,
  label: string,
  state: SceneItemState,
): Promise<void> {
  await updateSceneItemInfo(id, label.trim() || 'Équipement', state, Date.now());
}

/** Hard-delete an item from the scene. */
export async function removeItem(id: string): Promise<void> {
  await deleteSceneItem(id);
}
