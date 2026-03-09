/**
 * TouchTarget — transparent, absolutely-positioned View handling gestures for
 * a single equipment item. Completely view-agnostic: works for both top view
 * and elevation view.
 *
 * Accepts projected canvas coordinates (itemX, itemY) so each canvas can
 * pass the right axis pair:
 *   - Top view:       itemX = item.x,  itemY = item.z
 *   - Elevation view: itemX = item.x,  itemY = item.y
 *
 * Gesture rules:
 *   - movement < TAP_PX on release → tap → onTap(id)
 *   - movement ≥ TAP_PX            → drag → onDragUpdate during move, onDragEnd on release
 *
 * KEY: gestureState.dx/dy are cumulative pixel deltas from gesture start,
 * computed internally by React Native — always reliable regardless of
 * coordinate space.
 */
import { useRef } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';

const TOUCH_R = 34; // touch target radius (px) — slightly larger than visual icon
const TAP_PX  = 8;  // movement threshold to distinguish tap vs drag

interface Props {
  itemId: string;
  /** Projected horizontal position in canvas space (0–1). */
  itemX: number;
  /** Projected vertical position in canvas space (0–1). */
  itemY: number;
  stageOffsetX: number; // canvas stage left padding (px)
  stageOffsetY: number; // canvas stage top  padding (px)
  stageW: number;       // usable stage width  (px)
  stageH: number;       // usable stage height (px)
  onTap: (id: string) => void;
  onDragUpdate: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export function TouchTarget({
  itemId, itemX, itemY,
  stageOffsetX, stageOffsetY, stageW, stageH,
  onTap, onDragUpdate, onDragEnd,
}: Props) {
  // Always-fresh refs — PanResponder is created once but reads latest values
  const onTapRef        = useRef(onTap);
  const onDragUpdateRef = useRef(onDragUpdate);
  const onDragEndRef    = useRef(onDragEnd);
  const coordRef        = useRef({ itemX, itemY });
  const stageRef        = useRef({ stageOffsetX, stageOffsetY, stageW, stageH });

  onTapRef.current        = onTap;
  onDragUpdateRef.current = onDragUpdate;
  onDragEndRef.current    = onDragEnd;
  coordRef.current        = { itemX, itemY };
  stageRef.current        = { stageOffsetX, stageOffsetY, stageW, stageH };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onShouldBlockNativeResponder: () => true,

      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) < TAP_PX && Math.abs(gs.dy) < TAP_PX) return;
        const { stageW: sw, stageH: sh } = stageRef.current;
        const { itemX: ox, itemY: oy } = coordRef.current;
        const newX = Math.max(0.02, Math.min(0.98, ox + gs.dx / sw));
        const newY = Math.max(0.02, Math.min(0.98, oy + gs.dy / sh));
        onDragUpdateRef.current(itemId, newX, newY);
      },

      onPanResponderRelease: (_, gs) => {
        const { stageW: sw, stageH: sh } = stageRef.current;
        const { itemX: ox, itemY: oy } = coordRef.current;
        if (Math.abs(gs.dx) < TAP_PX && Math.abs(gs.dy) < TAP_PX) {
          onTapRef.current(itemId);
        } else {
          const newX = Math.max(0.02, Math.min(0.98, ox + gs.dx / sw));
          const newY = Math.max(0.02, Math.min(0.98, oy + gs.dy / sh));
          onDragEndRef.current(itemId, newX, newY);
        }
      },

      onPanResponderTerminate: () => { /* gesture cancelled by system */ },
    }),
  );

  // Center the touch target on the item's committed canvas position
  const left = stageOffsetX + itemX * stageW - TOUCH_R;
  const top  = stageOffsetY + itemY * stageH - TOUCH_R;

  return (
    <View
      style={[styles.target, { left, top }]}
      {...panResponder.current.panHandlers}
    />
  );
}

const styles = StyleSheet.create({
  target: {
    position: 'absolute',
    width:  TOUCH_R * 2,
    height: TOUCH_R * 2,
    // Fully transparent — all visuals come from Skia
  },
});
