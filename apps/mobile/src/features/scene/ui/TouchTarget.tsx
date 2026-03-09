/**
 * TouchTarget — transparent, absolutely-positioned View that handles all gestures
 * for a single scene equipment item.
 *
 * KEY INSIGHT: gestureState.dx/dy are cumulative pixel deltas computed internally
 * by React Native's gesture system. They are ALWAYS correct regardless of View
 * coordinate issues, unlike locationX/Y which can be unreliable.
 *
 * This component is VISUALLY INVISIBLE — all rendering is done by the Skia canvas.
 * It only exists to capture touches over the item's position.
 *
 * Gesture rules:
 *   - movement < TAP_PX on release → tap → onTap(id)
 *   - movement > TAP_PX             → drag → onDragUpdate during move, onDragEnd on release
 */
import { useRef } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import type { SceneItem } from '@shared/types';

// Touch target slightly larger than the visual icon radius (26px)
const TOUCH_R = 34;
const TAP_PX   = 8;

interface Props {
  item: SceneItem;
  stageOffsetX: number;  // canvas padding left (px)
  stageOffsetY: number;  // canvas padding top  (px)
  stageW: number;        // usable stage width  (px)
  stageH: number;        // usable stage height (px)
  onTap: (id: string) => void;
  onDragUpdate: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export function TouchTarget({
  item, stageOffsetX, stageOffsetY, stageW, stageH,
  onTap, onDragUpdate, onDragEnd,
}: Props) {
  // Always-fresh refs — PanResponder created once but reads latest values
  const onTapRef         = useRef(onTap);
  const onDragUpdateRef  = useRef(onDragUpdate);
  const onDragEndRef     = useRef(onDragEnd);
  const itemRef          = useRef(item);
  const stageRef         = useRef({ stageOffsetX, stageOffsetY, stageW, stageH });

  onTapRef.current        = onTap;
  onDragUpdateRef.current = onDragUpdate;
  onDragEndRef.current    = onDragEnd;
  itemRef.current         = item;
  stageRef.current        = { stageOffsetX, stageOffsetY, stageW, stageH };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: () => {
        // Touch started on this item — nothing to do yet
      },

      onPanResponderMove: (_, gs) => {
        // gestureState.dx/dy = cumulative displacement from touch start (always reliable)
        if (Math.abs(gs.dx) < TAP_PX && Math.abs(gs.dy) < TAP_PX) return;
        const { stageW: sw, stageH: sh } = stageRef.current;
        const { x, y, id } = itemRef.current;
        const newX = Math.max(0.02, Math.min(0.98, x + gs.dx / sw));
        const newY = Math.max(0.02, Math.min(0.98, y + gs.dy / sh));
        onDragUpdateRef.current(id, newX, newY);
      },

      onPanResponderRelease: (_, gs) => {
        const { id, x, y } = itemRef.current;
        const { stageW: sw, stageH: sh } = stageRef.current;
        if (Math.abs(gs.dx) < TAP_PX && Math.abs(gs.dy) < TAP_PX) {
          onTapRef.current(id);
        } else {
          const newX = Math.max(0.02, Math.min(0.98, x + gs.dx / sw));
          const newY = Math.max(0.02, Math.min(0.98, y + gs.dy / sh));
          onDragEndRef.current(id, newX, newY);
        }
      },

      onPanResponderTerminate: () => {
        // Gesture cancelled (e.g. system interrupted) — nothing to do
      },
    }),
  );

  // Position the touch target centered on the item's committed location
  const left = stageOffsetX + item.x * stageW - TOUCH_R;
  const top  = stageOffsetY + item.y * stageH - TOUCH_R;

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
