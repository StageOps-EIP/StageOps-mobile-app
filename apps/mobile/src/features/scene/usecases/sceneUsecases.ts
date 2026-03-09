import {
  getAllSceneItems,
  insertSceneItem,
  updateSceneItemPositionTopView,
  updateSceneItemPositionElevation,
  updateSceneItemInfo,
  deleteSceneItem,
} from '@infra/db/repos/sceneItemRepo';
import { uuid } from '@shared/ids';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const DEFAULT_LABEL: Record<SceneItemType, string> = {
  light:   'Lumière',
  camera:  'Caméra',
  speaker: 'Enceinte',
};

const CLAMP = (v: number) => Math.min(0.95, Math.max(0.05, v));

// ─────────────────────────────────────────────
// Use-cases
// ─────────────────────────────────────────────

export async function loadItems(): Promise<SceneItem[]> {
  return getAllSceneItems();
}

/** Add a new item at the center of both canvas views. */
export async function addItem(type: SceneItemType): Promise<SceneItem> {
  const now = Date.now();
  const item: SceneItem = {
    id:         uuid(),
    type,
    label:      DEFAULT_LABEL[type],
    x:          0.5, // horizontal center
    y:          0.5, // mid-height (elevation view)
    z:          0.5, // mid-depth  (top view)
    state:      'ok',
    created_at: now,
    updated_at: now,
  };
  await insertSceneItem(item);
  return item;
}

/**
 * Persist position from a top-view drag.
 * Updates x (horizontal) and z (depth). Height y is preserved.
 */
export async function moveItemTopView(id: string, x: number, z: number): Promise<void> {
  await updateSceneItemPositionTopView(id, CLAMP(x), CLAMP(z), Date.now());
}

/**
 * Persist position from an elevation-view drag.
 * Updates x (horizontal) and y (height). Depth z is preserved.
 */
export async function moveItemElevation(id: string, x: number, y: number): Promise<void> {
  await updateSceneItemPositionElevation(id, CLAMP(x), CLAMP(y), Date.now());
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
