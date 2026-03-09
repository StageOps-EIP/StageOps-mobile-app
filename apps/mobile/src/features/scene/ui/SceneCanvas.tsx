/**
 * SceneCanvas — top-down "stage plot" view (projection: x = horizontal, z = depth).
 *
 * Architecture (only reliable pattern for Skia + gestures on iOS):
 *
 *   View (flex:1)
 *   ├── View [pointerEvents="none"]   ← Skia: ALL visuals, no touch interception
 *   │    └── Canvas (absoluteFill)
 *   ├── View [pointerEvents="none"]   ← RN text overlays (item labels, stage labels)
 *   └── Pressable (absoluteFill)      ← empty-space tap = deselect
 *        └── TouchTarget × N          ← transparent per-item gesture handlers
 *
 * Projection: canvas horizontal = item.x, canvas vertical = item.z (depth).
 * When a drag ends, onMoveItem(id, newX, newZ) is called.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  Canvas, Circle, Rect, RoundedRect, Group, Paint, Path,
} from '@shopify/react-native-skia';
import { TouchTarget } from './TouchTarget';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────

const STAGE_PAD = 20;

const STATE_COLOR: Record<SceneItemState, string> = {
  ok:            '#22c55e',
  a_verifier:    '#f59e0b',
  hors_service:  '#ef4444',
  en_reparation: '#38bdf8',
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DragState { id: string; x: number; y: number }

interface Props {
  items: SceneItem[];
  selectedId: string | null;
  onTapItem: (id: string) => void;
  /** Called with (id, newX, newZ) — horizontal and depth axes. */
  onMoveItem: (id: string, x: number, z: number) => void;
  onDeselect: () => void;
}

// ─────────────────────────────────────────────
// Icon components (Skia primitives)
// ─────────────────────────────────────────────

function LightIcon({ color, selected }: { color: string; selected: boolean }) {
  const R = 13;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI;
    const x1 = Math.cos(a) * (R + 3);  const y1 = Math.sin(a) * (R + 3);
    const x2 = Math.cos(a) * (R + 9);  const y2 = Math.sin(a) * (R + 9);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(' ');
  return (
    <>
      {selected && <Circle cx={0} cy={0} r={R + 12}><Paint color="#ffffff" style="stroke" strokeWidth={2.5} /></Circle>}
      <Circle cx={0} cy={0} r={R} color={color} opacity={0.22} />
      <Circle cx={0} cy={0} r={R}><Paint color={color} style="stroke" strokeWidth={2.5} /></Circle>
      <Path path={rays}><Paint color={color} style="stroke" strokeWidth={1.5} strokeCap="round" /></Path>
      <Circle cx={0} cy={0} r={3} color={color} />
    </>
  );
}

function CameraIcon({ color, selected }: { color: string; selected: boolean }) {
  const W = 28; const H = 18; const lensR = 6;
  return (
    <>
      {selected && <RoundedRect x={-W/2-8} y={-H/2-8} width={W+lensR+14} height={H+16} r={5}><Paint color="#ffffff" style="stroke" strokeWidth={2.5} /></RoundedRect>}
      <RoundedRect x={-W/2} y={-H/2} width={W} height={H} r={4} color={color} opacity={0.22} />
      <RoundedRect x={-W/2} y={-H/2} width={W} height={H} r={4}><Paint color={color} style="stroke" strokeWidth={2.5} /></RoundedRect>
      <Path path={`M -7 0 L 7 0 M 0 -6 L 0 6`}><Paint color={color} style="stroke" strokeWidth={1} opacity={0.55} /></Path>
      <Circle cx={W/2+lensR-1} cy={0} r={lensR} color={color} opacity={0.5} />
      <Circle cx={W/2+lensR-1} cy={0} r={lensR}><Paint color={color} style="stroke" strokeWidth={2} /></Circle>
    </>
  );
}

function SpeakerIcon({ color, selected }: { color: string; selected: boolean }) {
  const W = 18; const H = 26;
  return (
    <>
      {selected && <Rect x={-W/2-8} y={-H/2-12} width={W+16} height={H+20}><Paint color="#ffffff" style="stroke" strokeWidth={2.5} /></Rect>}
      <Rect x={-W/2} y={-H/2+6} width={W} height={H-6} color={color} opacity={0.22} />
      <Rect x={-W/2} y={-H/2+6} width={W} height={H-6}><Paint color={color} style="stroke" strokeWidth={2.5} /></Rect>
      <Path path={`M -9 ${-H/2+2} Q 0 ${-H/2-6} 9 ${-H/2+2}`}><Paint color={color} style="stroke" strokeWidth={2} strokeCap="round" /></Path>
      <Path path={`M -13 ${-H/2-2} Q 0 ${-H/2-12} 13 ${-H/2-2}`}><Paint color={color} style="stroke" strokeWidth={1.5} strokeCap="round" opacity={0.6} /></Path>
    </>
  );
}

const ICON: Record<SceneItemType, (p: { color: string; selected: boolean }) => React.ReactElement> = {
  light:   p => <LightIcon {...p} />,
  camera:  p => <CameraIcon {...p} />,
  speaker: p => <SpeakerIcon {...p} />,
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function SceneCanvas({ items, selectedId, onTapItem, onMoveItem, onDeselect }: Props) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  // Live drag state — drives Skia re-render at finger position during drag
  const [drag, setDrag] = useState<DragState | null>(null);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const handleDragUpdate = useCallback((id: string, x: number, y: number) => {
    setDrag({ id, x, y });
  }, []);

  const handleDragEnd = useCallback((id: string, x: number, z: number) => {
    setDrag(null);
    onMoveItem(id, x, z);
  }, [onMoveItem]);

  const stageW = size.w - STAGE_PAD * 2;
  const stageH = size.h - STAGE_PAD * 2;

  /** Effective canvas position for an item (drag override > committed coords). */
  const eff = (item: SceneItem) => {
    if (drag && drag.id === item.id) return { cx: drag.x, cy: drag.y };
    return { cx: item.x, cy: item.z }; // TOP VIEW: horizontal=x, vertical=z (depth)
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>

      {/* ═══ LAYER 1: Skia visuals — non-interactive ═══ */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Canvas style={StyleSheet.absoluteFillObject}>

          {/* Stage floor */}
          <Rect x={STAGE_PAD} y={STAGE_PAD} width={stageW} height={stageH} color="#0d1520" />

          {/* Borders */}
          <Rect x={STAGE_PAD} y={STAGE_PAD} width={stageW} height={2} color="#2563eb" />
          <Rect x={STAGE_PAD} y={STAGE_PAD + stageH - 4} width={stageW} height={4} color="#1e40af" />
          <Rect x={STAGE_PAD} y={STAGE_PAD} width={1.5} height={stageH} color="#1e3a5f" />
          <Rect x={STAGE_PAD + stageW - 1.5} y={STAGE_PAD} width={1.5} height={stageH} color="#1e3a5f" />

          {/* Grid (5×5) */}
          {Array.from({ length: 5 }, (_, i) => (
            <React.Fragment key={i}>
              <Rect x={STAGE_PAD + stageW * ((i+1)/6)} y={STAGE_PAD}    width={0.5} height={stageH} color="#111d2e" />
              <Rect x={STAGE_PAD} y={STAGE_PAD + stageH * ((i+1)/6)}    width={stageW} height={0.5} color="#111d2e" />
            </React.Fragment>
          ))}

          {/* Center crosshair */}
          <Rect x={STAGE_PAD + stageW/2 - 15} y={STAGE_PAD + stageH/2} width={30} height={0.5} color="#1e3a5f" />
          <Rect x={STAGE_PAD + stageW/2} y={STAGE_PAD + stageH/2 - 15} width={0.5} height={30} color="#1e3a5f" />

          {/* Equipment icons */}
          {items.map(item => {
            const { cx, cy } = eff(item);
            const px = STAGE_PAD + cx * stageW;
            const py = STAGE_PAD + cy * stageH;
            const color = STATE_COLOR[item.state];
            const selected = item.id === selectedId;
            return (
              <Group key={item.id} transform={[{ translateX: px }, { translateY: py }]}>
                {ICON[item.type]({ color, selected })}
              </Group>
            );
          })}

        </Canvas>
      </View>

      {/* ═══ LAYER 2: RN text overlays — non-interactive ═══ */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {size.w > 1 && (
          <Text style={[styles.avantScene, { top: STAGE_PAD + stageH - 22, left: STAGE_PAD + stageW / 2 - 56 }]}>
            ↓ AVANT SCÈNE
          </Text>
        )}
        {items.map(item => {
          if (!item.label) return null;
          const { cx, cy } = eff(item);
          const px = STAGE_PAD + cx * stageW;
          const py = STAGE_PAD + cy * stageH;
          return (
            <Text key={item.id} style={[styles.itemLabel, { left: px - 40, top: py + 26 }]} numberOfLines={1}>
              {item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label}
            </Text>
          );
        })}
      </View>

      {/* ═══ LAYER 3: Gesture layer ═══ */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onDeselect}>
        {size.w > 1 && items.map(item => (
          <TouchTarget
            key={item.id}
            itemId={item.id}
            itemX={item.x}
            itemY={item.z}  // TOP VIEW: vertical canvas axis = depth (z)
            stageOffsetX={STAGE_PAD}
            stageOffsetY={STAGE_PAD}
            stageW={stageW}
            stageH={stageH}
            onTap={onTapItem}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Pressable>

      {items.length === 0 && (
        <View style={styles.emptyHint} pointerEvents="none">
          <Text style={styles.emptyText}>Appuyez sur Créer pour ajouter un équipement</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#060d18' },
  avantScene: {
    position: 'absolute', fontSize: 10, fontWeight: '700',
    color: '#1e3a5f', letterSpacing: 1.5, width: 112, textAlign: 'center',
  },
  itemLabel: {
    position: 'absolute', width: 80, fontSize: 10, fontWeight: '600',
    color: '#94a3b8', textAlign: 'center',
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  emptyHint: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#334155', textAlign: 'center', paddingHorizontal: 40 },
});
