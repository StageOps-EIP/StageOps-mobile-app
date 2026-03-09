/**
 * ItemView — a single scene item rendered as a React Native View.
 *
 * Why not Skia? The Skia Canvas intercepts all touches in its bounds, preventing
 * parent PanResponders from receiving events reliably. By using a real RN View for
 * each item, we bypass this problem entirely: each item manages its own gestures.
 *
 * Gesture logic (gestureState.dx/dy are always reliable — no coordinate system issues):
 *   - Touch + no movement (< TAP_PX) → tap → onTap()
 *   - Touch + movement (> TAP_PX)    → drag → live position update → onDragEnd(x, y)
 */
import { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const ITEM_RADIUS = 26;  // visual + touch radius
const TAP_PX = 8;               // movement threshold: below = tap, above = drag

const TYPE_COLOR: Record<SceneItemType, string> = {
  light:   '#fbbf24',
  camera:  '#60a5fa',
  speaker: '#a78bfa',
};

const TYPE_EMOJI: Record<SceneItemType, string> = {
  light:   '💡',
  camera:  '📷',
  speaker: '🔊',
};

const STATE_COLOR: Record<SceneItemState, string> = {
  ok:            '#22c55e',
  a_verifier:    '#f59e0b',
  hors_service:  '#ef4444',
  en_reparation: '#38bdf8',
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Props {
  item: SceneItem;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onTap: () => void;
  onDragEnd: (newX: number, newY: number) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ItemView({ item, canvasWidth, canvasHeight, isSelected, onTap, onDragEnd }: Props) {
  // Live drag position (fractional, 0-1) — null when not dragging
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const livePosRef = useRef<{ x: number; y: number } | null>(null);

  // Stable refs — always point to latest props/state without recreating PanResponder
  const onTapRef     = useRef(onTap);
  const onDragEndRef = useRef(onDragEnd);
  const itemRef      = useRef(item);
  const canvasRef    = useRef({ w: canvasWidth, h: canvasHeight });
  onTapRef.current     = onTap;
  onDragEndRef.current = onDragEnd;
  itemRef.current      = item;
  canvasRef.current    = { w: canvasWidth, h: canvasHeight };

  // ── PanResponder — created ONCE per item
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: () => {
        livePosRef.current = null;
      },

      onPanResponderMove: (_, gs) => {
        // gestureState.dx/dy = cumulative pixel delta since touch start.
        // These are computed by React Native internally — always correct.
        if (Math.hypot(gs.dx, gs.dy) < TAP_PX) return;

        const { w, h } = canvasRef.current;
        const newX = Math.max(0.03, Math.min(0.97, itemRef.current.x + gs.dx / w));
        const newY = Math.max(0.03, Math.min(0.97, itemRef.current.y + gs.dy / h));
        const pos = { x: newX, y: newY };
        livePosRef.current = pos;
        setLivePos(pos);
      },

      onPanResponderRelease: (_, gs) => {
        if (Math.hypot(gs.dx, gs.dy) < TAP_PX) {
          onTapRef.current();
        } else if (livePosRef.current) {
          onDragEndRef.current(livePosRef.current.x, livePosRef.current.y);
        }
        livePosRef.current = null;
        setLivePos(null);
      },

      onPanResponderTerminate: () => {
        livePosRef.current = null;
        setLivePos(null);
      },
    }),
  );

  // Effective position: live (during drag) or persisted
  const effX = livePos ? livePos.x : item.x;
  const effY = livePos ? livePos.y : item.y;

  const left = effX * canvasWidth  - ITEM_RADIUS;
  const top  = effY * canvasHeight - ITEM_RADIUS;

  return (
    <View
      style={[
        styles.item,
        {
          left,
          top,
          backgroundColor: TYPE_COLOR[item.type],
          zIndex: isSelected ? 20 : 1,
        },
        isSelected && styles.itemSelected,
      ]}
      {...panResponder.current.panHandlers}
    >
      <Text style={styles.emoji}>{TYPE_EMOJI[item.type]}</Text>
      {/* State indicator dot */}
      <View style={[styles.stateDot, { backgroundColor: STATE_COLOR[item.state] }]} />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    width:  ITEM_RADIUS * 2,
    height: ITEM_RADIUS * 2,
    borderRadius: ITEM_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  itemSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  emoji: {
    fontSize: 18,
  },
  stateDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
});
