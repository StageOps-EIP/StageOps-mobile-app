/**
 * ViewToggle — animated sliding pill toggle between top view and elevation view.
 *
 * Uses React Native's built-in Animated API (no Reanimated dependency).
 * Matches the app's dark theme and professional design language.
 */
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SceneView = 'top' | 'elevation';

interface Props {
  view: SceneView;
  onChange: (view: SceneView) => void;
}

const TOGGLE_W = 220;
const PILL_W   = 108;
const HEIGHT   = 36;

const OPTIONS: { view: SceneView; label: string; icon: string }[] = [
  { view: 'top',       label: 'Vue dessus',    icon: 'grid-outline'         },
  { view: 'elevation', label: 'Élévation',     icon: 'layers-outline'       },
];

export function ViewToggle({ view, onChange }: Props) {
  const anim = useRef(new Animated.Value(view === 'top' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: view === 'top' ? 0 : 1,
      useNativeDriver: false,
      tension: 180,
      friction: 22,
    }).start();
  }, [view, anim]);

  const pillLeft = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [2, TOGGLE_W / 2 - 2],
  });

  return (
    <View style={styles.track}>
      {/* Animated sliding pill (background) */}
      <Animated.View style={[styles.pill, { left: pillLeft }]} />

      {/* Tabs */}
      {OPTIONS.map(opt => {
        const active = view === opt.view;
        return (
          <TouchableOpacity
            key={opt.view}
            style={styles.tab}
            onPress={() => onChange(opt.view)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={opt.icon as never}
              size={13}
              color={active ? '#e2e8f0' : '#475569'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TOGGLE_W,
    height: HEIGHT,
    backgroundColor: '#0f172a',
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    width: PILL_W,
    height: HEIGHT - 4,
    backgroundColor: '#1e3a8a',
    borderRadius: (HEIGHT - 4) / 2,
    top: 2,
  },
  tab: {
    width: TOGGLE_W / 2,
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#e2e8f0',
  },
});
