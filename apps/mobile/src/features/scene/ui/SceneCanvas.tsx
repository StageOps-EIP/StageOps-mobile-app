/**
 * SceneCanvas — stage background (Skia) + interactive item views (React Native).
 *
 * Architecture:
 *   View (flex:1, onLayout)
 *     ├─ View pointerEvents="none"   ← Skia canvas: background only, no touches
 *     │    └─ Canvas (absoluteFill)
 *     └─ Pressable (absoluteFill)    ← tap empty space → deselect
 *          └─ ItemView × N           ← each item handles its own tap/drag
 *
 * Why separate Skia from items: the Skia Canvas native component intercepts
 * all touches in its bounds, so PanResponder on a parent wrapper doesn't work
 * reliably. By wrapping Canvas in pointerEvents="none", touches pass through to
 * the Pressable and ItemViews which handle everything correctly.
 */
import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { ItemView } from './ItemView';
import type { SceneItem } from '@shared/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Props {
  items: SceneItem[];
  selectedId: string | null;
  onTapItem: (id: string) => void;
  onMoveItem: (id: string, x: number, y: number) => void;
  onDeselect: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function SceneCanvas({ items, selectedId, onTapItem, onMoveItem, onDeselect }: Props) {
  const [size, setSize] = useState({ w: 1, h: 1 });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  // Stage area: canvas minus 16 px padding on each side
  const PAD = 16;
  const stageW = size.w - PAD * 2;
  const stageH = size.h - PAD * 2;

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>

      {/* ── Skia: stage background — wrapped in pointerEvents="none" so it
           never intercepts touches, regardless of Skia's native touch handling. ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Canvas style={StyleSheet.absoluteFillObject}>
          {/* Stage floor */}
          <Rect x={PAD} y={PAD} width={stageW} height={stageH} color="#111827" />
          {/* Borders */}
          <Rect x={PAD}              y={PAD}              width={stageW} height={1}       color="#1e3a5f" />
          <Rect x={PAD}              y={PAD + stageH - 1} width={stageW} height={1}       color="#1e3a5f" />
          <Rect x={PAD}              y={PAD}              width={1}      height={stageH}  color="#1e3a5f" />
          <Rect x={PAD + stageW - 1} y={PAD}              width={1}      height={stageH}  color="#1e3a5f" />
          {/* Grid 3×3 */}
          {[1, 2, 3].map(i => (
            <React.Fragment key={i}>
              <Rect x={PAD + stageW * (i / 4)} y={PAD}              width={1}      height={stageH} color="#1a2540" />
              <Rect x={PAD}                    y={PAD + stageH * (i / 4)} width={stageW} height={1}      color="#1a2540" />
            </React.Fragment>
          ))}
        </Canvas>
      </View>

      {/* ── Interactive layer: Pressable for deselect + ItemViews ──
           When user taps an item → ItemView's PanResponder captures the touch,
           Pressable's onPress does NOT fire.
           When user taps empty space → no child captures it, Pressable fires. ── */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onDeselect}>
        {size.w > 1 && items.map(item => (
          <ItemView
            key={item.id}
            item={item}
            canvasWidth={size.w}
            canvasHeight={size.h}
            isSelected={item.id === selectedId}
            onTap={() => onTapItem(item.id)}
            onDragEnd={(x, y) => onMoveItem(item.id, x, y)}
          />
        ))}
      </Pressable>

    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
});
