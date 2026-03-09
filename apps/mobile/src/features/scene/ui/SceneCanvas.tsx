/**
 * SceneCanvas — professional top-down "stage plot" view.
 *
 * Architecture (the ONLY reliable pattern with Skia on iOS):
 *
 *   View (flex:1, measures canvas size via onLayout)
 *   ├── View [pointerEvents="none"]     ← Skia layer — ALL visuals, no touch interception
 *   │    └── Canvas (absoluteFill)
 *   │         ├── StageBackground (floor, grid, "AVANT SCENE" marker line)
 *   │         └── Equipment icons (light/camera/speaker with state colors)
 *   ├── View [pointerEvents="none"]     ← RN label overlay (item labels, stage text)
 *   └── Pressable (absoluteFill)        ← tap on empty space = deselect
 *        └── TouchTarget × N            ← transparent per-item touch handlers
 *
 * Why this works:
 *   - Skia Canvas wrapped in pointerEvents="none" → touches pass through completely
 *   - Each TouchTarget has its own PanResponder, uses gestureState.dx/dy (always reliable)
 *   - Pressable only fires when no TouchTarget captures the touch (empty space tap)
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

const STAGE_PAD = 20; // canvas padding around stage

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
  onMoveItem: (id: string, x: number, y: number) => void;
  onDeselect: () => void;
}

// ─────────────────────────────────────────────
// Icon components (used inside Skia Canvas)
// ─────────────────────────────────────────────

/** Stage lighting symbol: circle + 8 radiating rays */
function LightIcon({ color, selected }: { color: string; selected: boolean }) {
  const R = 13;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI;
    const x1 = Math.cos(a) * (R + 3);
    const y1 = Math.sin(a) * (R + 3);
    const x2 = Math.cos(a) * (R + 9);
    const y2 = Math.sin(a) * (R + 9);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(' ');

  return (
    <>
      {selected && (
        <Circle cx={0} cy={0} r={R + 12}>
          <Paint color="#ffffff" style="stroke" strokeWidth={2.5} />
        </Circle>
      )}
      <Circle cx={0} cy={0} r={R} color={color} opacity={0.22} />
      <Circle cx={0} cy={0} r={R}>
        <Paint color={color} style="stroke" strokeWidth={2.5} />
      </Circle>
      <Path path={rays}>
        <Paint color={color} style="stroke" strokeWidth={1.5} strokeCap="round" />
      </Path>
      <Circle cx={0} cy={0} r={3} color={color} />
    </>
  );
}

/** Camera symbol: rounded rect body + lens circle */
function CameraIcon({ color, selected }: { color: string; selected: boolean }) {
  const W = 28; const H = 18; const lensR = 6;
  return (
    <>
      {selected && (
        <RoundedRect x={-W / 2 - 8} y={-H / 2 - 8} width={W + lensR + 14} height={H + 16} r={5}>
          <Paint color="#ffffff" style="stroke" strokeWidth={2.5} />
        </RoundedRect>
      )}
      {/* Body */}
      <RoundedRect x={-W / 2} y={-H / 2} width={W} height={H} r={4} color={color} opacity={0.22} />
      <RoundedRect x={-W / 2} y={-H / 2} width={W} height={H} r={4}>
        <Paint color={color} style="stroke" strokeWidth={2.5} />
      </RoundedRect>
      {/* Viewfinder cross */}
      <Path path={`M -7 0 L 7 0 M 0 -6 L 0 6`}>
        <Paint color={color} style="stroke" strokeWidth={1} opacity={0.55} />
      </Path>
      {/* Lens */}
      <Circle cx={W / 2 + lensR - 1} cy={0} r={lensR} color={color} opacity={0.5} />
      <Circle cx={W / 2 + lensR - 1} cy={0} r={lensR}>
        <Paint color={color} style="stroke" strokeWidth={2} />
      </Circle>
    </>
  );
}

/** Speaker symbol: rectangle + sound wave arcs */
function SpeakerIcon({ color, selected }: { color: string; selected: boolean }) {
  const W = 18; const H = 26;
  return (
    <>
      {selected && (
        <Rect x={-W / 2 - 8} y={-H / 2 - 12} width={W + 16} height={H + 20}>
          <Paint color="#ffffff" style="stroke" strokeWidth={2.5} />
        </Rect>
      )}
      {/* Body */}
      <Rect x={-W / 2} y={-H / 2 + 6} width={W} height={H - 6} color={color} opacity={0.22} />
      <Rect x={-W / 2} y={-H / 2 + 6} width={W} height={H - 6}>
        <Paint color={color} style="stroke" strokeWidth={2.5} />
      </Rect>
      {/* Sound waves (arcs above body) */}
      <Path path={`M -9 ${-H / 2 + 2} Q 0 ${-H / 2 - 6} 9 ${-H / 2 + 2}`}>
        <Paint color={color} style="stroke" strokeWidth={2} strokeCap="round" />
      </Path>
      <Path path={`M -13 ${-H / 2 - 2} Q 0 ${-H / 2 - 12} 13 ${-H / 2 - 2}`}>
        <Paint color={color} style="stroke" strokeWidth={1.5} strokeCap="round" opacity={0.6} />
      </Path>
    </>
  );
}

const ICON: Record<SceneItemType, (props: { color: string; selected: boolean }) => React.ReactElement> = {
  light:   props => <LightIcon {...props} />,
  camera:  props => <CameraIcon {...props} />,
  speaker: props => <SpeakerIcon {...props} />,
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function SceneCanvas({ items, selectedId, onTapItem, onMoveItem, onDeselect }: Props) {
  const [size, setSize] = useState({ w: 1, h: 1 });

  // Live drag position — updated many times per second during drag.
  // SceneCanvas owns this so Skia can re-render the icon at the moving position.
  const [drag, setDrag] = useState<DragState | null>(null);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const handleDragUpdate = useCallback((id: string, x: number, y: number) => {
    setDrag({ id, x, y });
  }, []);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setDrag(null);
    onMoveItem(id, x, y);
  }, [onMoveItem]);

  const stageW = size.w - STAGE_PAD * 2;
  const stageH = size.h - STAGE_PAD * 2;

  /** Resolve effective item position (drag override > committed) */
  const eff = (item: SceneItem) => {
    if (drag && drag.id === item.id) return { x: drag.x, y: drag.y };
    return { x: item.x, y: item.y };
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>

      {/* ═══ LAYER 1: Skia visuals — pointerEvents="none" prevents ALL touch interception ═══ */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Canvas style={StyleSheet.absoluteFillObject}>

          {/* ── Stage floor ── */}
          <Rect x={STAGE_PAD} y={STAGE_PAD} width={stageW} height={stageH} color="#0d1520" />

          {/* ── Stage borders ── */}
          {/* Upstage (back) — thin blue line */}
          <Rect x={STAGE_PAD} y={STAGE_PAD} width={stageW} height={2} color="#2563eb" />
          {/* Downstage (front) — thicker line marking front-of-stage */}
          <Rect x={STAGE_PAD} y={STAGE_PAD + stageH - 4} width={stageW} height={4} color="#1e40af" />
          {/* Side walls */}
          <Rect x={STAGE_PAD} y={STAGE_PAD} width={1.5} height={stageH} color="#1e3a5f" />
          <Rect x={STAGE_PAD + stageW - 1.5} y={STAGE_PAD} width={1.5} height={stageH} color="#1e3a5f" />

          {/* ── Grid (5×5) ── */}
          {Array.from({ length: 5 }, (_, i) => {
            const gx = STAGE_PAD + stageW * ((i + 1) / 6);
            const gy = STAGE_PAD + stageH * ((i + 1) / 6);
            return (
              <React.Fragment key={i}>
                <Rect x={gx} y={STAGE_PAD}    width={0.5} height={stageH} color="#111d2e" />
                <Rect x={STAGE_PAD} y={gy}    width={stageW} height={0.5} color="#111d2e" />
              </React.Fragment>
            );
          })}

          {/* ── Center crosshair (placement guide) ── */}
          <Rect
            x={STAGE_PAD + stageW / 2 - 15} y={STAGE_PAD + stageH / 2}
            width={30} height={0.5} color="#1e3a5f"
          />
          <Rect
            x={STAGE_PAD + stageW / 2} y={STAGE_PAD + stageH / 2 - 15}
            width={0.5} height={30} color="#1e3a5f"
          />

          {/* ── Equipment icons ── */}
          {items.map(item => {
            const { x: fx, y: fy } = eff(item);
            const px = STAGE_PAD + fx * stageW;
            const py = STAGE_PAD + fy * stageH;
            const color = STATE_COLOR[item.state];
            const selected = item.id === selectedId;
            const IconFn = ICON[item.type];
            return (
              <Group key={item.id} transform={[{ translateX: px }, { translateY: py }]}>
                {IconFn({ color, selected })}
              </Group>
            );
          })}

        </Canvas>
      </View>

      {/* ═══ LAYER 2: RN text overlays — non-interactive ═══ */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {/* "AVANT SCÈNE" label at the bottom edge of stage */}
        {size.w > 1 && (
          <Text style={[
            styles.avantScene,
            { top: STAGE_PAD + stageH - 22, left: STAGE_PAD + stageW / 2 - 56 },
          ]}>
            ↓ AVANT SCÈNE
          </Text>
        )}
        {/* Item labels */}
        {items.map(item => {
          if (!item.label) return null;
          const { x: fx, y: fy } = eff(item);
          const px = STAGE_PAD + fx * stageW;
          const py = STAGE_PAD + fy * stageH;
          return (
            <Text
              key={item.id}
              style={[styles.itemLabel, { left: px - 40, top: py + 26 }]}
              numberOfLines={1}
            >
              {item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label}
            </Text>
          );
        })}
      </View>

      {/* ═══ LAYER 3: Gesture layer ═══
           Pressable = deselect on empty tap.
           TouchTarget children = per-item gesture handlers.
           When a TouchTarget captures a touch, Pressable.onPress does NOT fire. ═══ */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onDeselect}>
        {size.w > 1 && items.map(item => (
          <TouchTarget
            key={item.id}
            item={item}
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

      {/* ── Empty state hint ── */}
      {items.length === 0 && (
        <View style={styles.emptyHint} pointerEvents="none">
          <Text style={styles.emptyText}>Appuyez sur Créer pour ajouter un équipement</Text>
        </View>
      )}

    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#060d18',
  },
  avantScene: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#1e3a5f',
    letterSpacing: 1.5,
    width: 112,
    textAlign: 'center',
  },
  itemLabel: {
    position: 'absolute',
    width: 80,
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
