/**
 * ElevationCanvas — front-elevation view of the stage (projection: x = horizontal, y = height).
 *
 * Same architecture as SceneCanvas:
 *   View (flex:1)
 *   ├── View [pointerEvents="none"]   ← Skia: stage background + equipment icons
 *   ├── View [pointerEvents="none"]   ← RN text overlays
 *   └── Pressable (absoluteFill)      ← deselect on empty tap
 *        └── TouchTarget × N          ← transparent per-item gesture handlers
 *
 * Projection: canvas horizontal = item.x, canvas vertical = item.y (height).
 *   y=0.0 → top (fly tower)   y=1.0 → floor
 * When drag ends, onMoveItem(id, newX, newY) is called.
 *
 * Visual design: professional elevation/section drawing style —
 *   floor at bottom, fly tower at top, height markers on left, JARDIN/COUR labels.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  Canvas, Circle, Rect, RoundedRect, Group, Paint, Path, Line,
} from '@shopify/react-native-skia';
import { TouchTarget } from './TouchTarget';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────

const STAGE_PAD_H = 36; // horizontal padding (leaves room for JARDIN/COUR labels)
const STAGE_PAD_T = 16; // top padding
const STAGE_PAD_B = 20; // bottom padding (floor label)

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
  /** Called with (id, newX, newY) — horizontal and height axes. */
  onMoveItem: (id: string, x: number, y: number) => void;
  onDeselect: () => void;
}

// ─────────────────────────────────────────────
// Equipment icons (elevation view variants)
// In this view we see equipment from the FRONT — shapes adapted accordingly
// ─────────────────────────────────────────────

/** Light: circle with downward cone (illumination direction in elevation) */
function LightIconElev({ color, selected }: { color: string; selected: boolean }) {
  const R = 12;
  // Cone pointing downward
  const cone = `M -10 ${R + 2} L 0 ${R + 14} L 10 ${R + 2} Z`;
  return (
    <>
      {selected && <Circle cx={0} cy={0} r={R + 11}><Paint color="#ffffff" style="stroke" strokeWidth={2.5} /></Circle>}
      <Circle cx={0} cy={0} r={R} color={color} opacity={0.22} />
      <Circle cx={0} cy={0} r={R}><Paint color={color} style="stroke" strokeWidth={2.5} /></Circle>
      <Path path={cone} color={color} opacity={0.25} />
      <Path path={cone}><Paint color={color} style="stroke" strokeWidth={1.5} /></Path>
      <Circle cx={0} cy={0} r={3} color={color} />
    </>
  );
}

/** Camera: body + lens facing viewer (circular lens) */
function CameraIconElev({ color, selected }: { color: string; selected: boolean }) {
  const W = 26; const H = 18; const lensR = 7;
  return (
    <>
      {selected && <RoundedRect x={-W/2-8} y={-H/2-8} width={W+16} height={H+16} r={5}><Paint color="#ffffff" style="stroke" strokeWidth={2.5} /></RoundedRect>}
      <RoundedRect x={-W/2} y={-H/2} width={W} height={H} r={4} color={color} opacity={0.22} />
      <RoundedRect x={-W/2} y={-H/2} width={W} height={H} r={4}><Paint color={color} style="stroke" strokeWidth={2.5} /></RoundedRect>
      {/* Lens (circle, centered — front view) */}
      <Circle cx={0} cy={0} r={lensR} color={color} opacity={0.35} />
      <Circle cx={0} cy={0} r={lensR}><Paint color={color} style="stroke" strokeWidth={2} /></Circle>
      <Circle cx={0} cy={0} r={3} color={color} />
    </>
  );
}

/** Speaker: front face with driver cone + tweeter */
function SpeakerIconElev({ color, selected }: { color: string; selected: boolean }) {
  const W = 20; const H = 28;
  return (
    <>
      {selected && <Rect x={-W/2-8} y={-H/2-8} width={W+16} height={H+16}><Paint color="#ffffff" style="stroke" strokeWidth={2.5} /></Rect>}
      <Rect x={-W/2} y={-H/2} width={W} height={H} color={color} opacity={0.22} />
      <Rect x={-W/2} y={-H/2} width={W} height={H}><Paint color={color} style="stroke" strokeWidth={2.5} /></Rect>
      {/* Woofer cone (large circle) */}
      <Circle cx={0} cy={4} r={7} color={color} opacity={0.3} />
      <Circle cx={0} cy={4} r={7}><Paint color={color} style="stroke" strokeWidth={1.5} /></Circle>
      {/* Tweeter (small circle above) */}
      <Circle cx={0} cy={-9} r={3} color={color} opacity={0.5} />
    </>
  );
}

const ICON_ELEV: Record<SceneItemType, (p: { color: string; selected: boolean }) => React.ReactElement> = {
  light:   p => <LightIconElev {...p} />,
  camera:  p => <CameraIconElev {...p} />,
  speaker: p => <SpeakerIconElev {...p} />,
};

// ─────────────────────────────────────────────
// Height markers
// ─────────────────────────────────────────────

const HEIGHT_MARKS = [0, 0.25, 0.5, 0.75, 1.0]; // normalized heights to mark
const HEIGHT_LABELS = ['Sol', '3m', '6m', '9m', '12m'];

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function ElevationCanvas({ items, selectedId, onTapItem, onMoveItem, onDeselect }: Props) {
  const [size, setSize] = useState({ w: 1, h: 1 });
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

  const stageW = size.w - STAGE_PAD_H * 2;
  const stageH = size.h - STAGE_PAD_T - STAGE_PAD_B;
  const stageX = STAGE_PAD_H;
  const stageY = STAGE_PAD_T;

  /** Effective canvas position — drag override > committed (x, y) coords. */
  const eff = (item: SceneItem) => {
    if (drag && drag.id === item.id) return { cx: drag.x, cy: drag.y };
    return { cx: item.x, cy: item.y }; // ELEVATION VIEW: horizontal=x, vertical=y (height)
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>

      {/* ═══ LAYER 1: Skia visuals ═══ */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Canvas style={StyleSheet.absoluteFillObject}>

          {/* ── Stage background ── */}
          <Rect x={stageX} y={stageY} width={stageW} height={stageH} color="#0a1220" />

          {/* ── Fly tower zone (top 25%) — darker, dashed feel ── */}
          <Rect x={stageX} y={stageY} width={stageW} height={stageH * 0.25} color="#070e1a" />
          {/* Fly tower label line */}
          <Rect x={stageX} y={stageY + stageH * 0.25} width={stageW} height={0.5} color="#1e3a5f" />

          {/* ── Floor (solid line at bottom) ── */}
          <Rect x={stageX} y={stageY + stageH - 5} width={stageW} height={5} color="#1e3a5f" />
          {/* Ground shadow */}
          <Rect x={stageX} y={stageY + stageH - 5} width={stageW} height={1} color="#3b5998" />

          {/* ── Side walls ── */}
          <Rect x={stageX} y={stageY} width={2} height={stageH} color="#1e3a5f" />
          <Rect x={stageX + stageW - 2} y={stageY} width={2} height={stageH} color="#1e3a5f" />

          {/* ── Horizontal height markers (dashed effect via short rects) ── */}
          {HEIGHT_MARKS.map((norm, i) => {
            const lineY = stageY + norm * (stageH - 5);
            if (i === 0 || i === HEIGHT_MARKS.length - 1) return null; // floor/ceiling already drawn
            return (
              <React.Fragment key={i}>
                {/* Dashed line: alternating short rects */}
                {Array.from({ length: Math.floor(stageW / 10) }, (__, d) => (
                  <Rect
                    key={d}
                    x={stageX + d * 10}
                    y={lineY}
                    width={5}
                    height={0.5}
                    color="#0e1f38"
                  />
                ))}
              </React.Fragment>
            );
          })}

          {/* ── Vertical grid lines ── */}
          {Array.from({ length: 4 }, (_, i) => (
            <Rect
              key={i}
              x={stageX + stageW * ((i + 1) / 5)}
              y={stageY}
              width={0.5}
              height={stageH}
              color="#0d1a2e"
            />
          ))}

          {/* ── Equipment icons ── */}
          {items.map(item => {
            const { cx, cy } = eff(item);
            const px = stageX + cx * stageW;
            const py = stageY + cy * stageH;
            const color = STATE_COLOR[item.state];
            const selected = item.id === selectedId;
            return (
              <Group key={item.id} transform={[{ translateX: px }, { translateY: py }]}>
                {ICON_ELEV[item.type]({ color, selected })}
              </Group>
            );
          })}

        </Canvas>
      </View>

      {/* ═══ LAYER 2: RN text overlays ═══ */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>

        {/* Height labels on left side */}
        {size.w > 1 && HEIGHT_MARKS.map((norm, i) => {
          const labelY = stageY + norm * (stageH - 5) - 7;
          return (
            <Text
              key={i}
              style={[styles.heightLabel, { top: labelY, left: 4 }]}
            >
              {HEIGHT_LABELS[HEIGHT_MARKS.length - 1 - i]}
            </Text>
          );
        })}

        {/* "JARDIN" / "COUR" side labels */}
        {size.w > 1 && (
          <>
            <Text style={[styles.sideLabel, { top: stageY + stageH / 2 - 8, left: stageX + 4 }]}>
              JARDIN
            </Text>
            <Text style={[styles.sideLabel, { top: stageY + stageH / 2 - 8, right: 4 }]}>
              COUR
            </Text>
          </>
        )}

        {/* "FLY" zone label */}
        {size.w > 1 && (
          <Text style={[styles.flyLabel, { top: stageY + 4, left: stageX + stageW / 2 - 14 }]}>
            FLY
          </Text>
        )}

        {/* Item labels */}
        {items.map(item => {
          if (!item.label) return null;
          const { cx, cy } = eff(item);
          const px = stageX + cx * stageW;
          const py = stageY + cy * stageH;
          return (
            <Text
              key={item.id}
              style={[styles.itemLabel, { left: px - 40, top: py + 24 }]}
              numberOfLines={1}
            >
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
            itemY={item.y}  // ELEVATION VIEW: vertical canvas axis = height (y)
            stageOffsetX={stageX}
            stageOffsetY={stageY}
            stageW={stageW}
            stageH={stageH}
            onTap={onTapItem}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Pressable>

      {/* Empty state */}
      {items.length === 0 && (
        <View style={styles.emptyHint} pointerEvents="none">
          <Text style={styles.emptyText}>Aucun équipement — ajoutez-en via la vue de dessus</Text>
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
  heightLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    color: '#1e3a5f',
    width: 30,
    textAlign: 'right',
  },
  sideLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '700',
    color: '#1e3a5f',
    letterSpacing: 1,
    transform: [{ rotate: '-90deg' }],
    width: 50,
    textAlign: 'center',
  },
  flyLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: '#1e3a5f',
    letterSpacing: 2,
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
