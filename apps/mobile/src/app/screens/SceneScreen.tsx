import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { TabScreenProps } from '@app/navigation/types';
import { SyncStatusBanner } from '@features/sync/ui/SyncStatusBanner';
import { SceneCanvas } from '@features/scene/ui/SceneCanvas';
import { ElevationCanvas } from '@features/scene/ui/ElevationCanvas';
import { ItemSheet } from '@features/scene/ui/ItemSheet';
import { ViewToggle, type SceneView } from '@features/scene/ui/ViewToggle';
import {
  loadItems,
  addItem,
  moveItemTopView,
  moveItemElevation,
  saveItemInfo,
  removeItem,
} from '@features/scene/usecases/sceneUsecases';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

type Props = TabScreenProps<'Scene'>;

// ─── Static data ────────────────────────────────────────────────────────────

const ITEM_TYPES: {
  type: SceneItemType;
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  iconBg: string;
}[] = [
  {
    type: 'light',
    label: 'Lumière',
    subtitle: 'Éclairage de scène',
    icon: 'flashlight-outline',
    color: '#fbbf24',
    iconBg: '#1c1200',
  },
  {
    type: 'camera',
    label: 'Caméra',
    subtitle: 'Captation vidéo',
    icon: 'videocam-outline',
    color: '#60a5fa',
    iconBg: '#071428',
  },
  {
    type: 'speaker',
    label: 'Enceinte',
    subtitle: 'Diffusion sonore',
    icon: 'volume-high-outline',
    color: '#a78bfa',
    iconBg: '#150d28',
  },
];

const LEGEND: {
  label: string;
  color: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { label: 'OK',            color: '#22c55e', icon: 'checkmark-circle' },
  { label: 'À vérifier',   color: '#f59e0b', icon: 'alert-circle'     },
  { label: 'Hors service',  color: '#ef4444', icon: 'close-circle'     },
  { label: 'En réparation', color: '#38bdf8', icon: 'build'            },
  { label: 'Lumière',       color: '#fbbf24'                            },
  { label: 'Caméra',        color: '#60a5fa'                            },
  { label: 'Enceinte',      color: '#a78bfa'                            },
];

// ─── Screen ─────────────────────────────────────────────────────────────────

export function SceneScreen(_props: Props) {
  const insets = useSafeAreaInsets();

  const [items,           setItems]           = useState<SceneItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [viewMode,        setViewMode]        = useState<SceneView>('top');
  const [sheetVisible,    setSheetVisible]    = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [addPickerVisible,setAddPickerVisible]= useState(false);

  const selectedItem = items.find(i => i.id === selectedId) ?? null;

  // ── Load on focus ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadItems()
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, []),
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTapItem = (id: string) => {
    setSelectedId(id);
    setSheetVisible(true);
  };

  // TOP VIEW drag: updates x and z
  const handleMoveTopView = (id: string, x: number, z: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, x, z } : item));
    void moveItemTopView(id, x, z);
  };

  // ELEVATION VIEW drag: updates x and y
  const handleMoveElevation = (id: string, x: number, y: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, x, y } : item));
    void moveItemElevation(id, x, y);
  };

  const handleAdd = async (type: SceneItemType) => {
    setAddPickerVisible(false);
    try {
      const newItem = await addItem(type);
      setItems(prev => [...prev, newItem]);
      setSelectedId(newItem.id);
      setSheetVisible(true);
    } catch {
      // silent
    }
  };

  const handleSave = async (label: string, state: SceneItemState) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await saveItemInfo(selectedId, label, state);
      setItems(prev =>
        prev.map(item => item.id === selectedId ? { ...item, label, state } : item),
      );
      setSheetVisible(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await removeItem(selectedId);
      setItems(prev => prev.filter(i => i.id !== selectedId));
      setSelectedId(null);
      setSheetVisible(false);
    } catch {
      // silent
    }
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const isTopView      = viewMode === 'top';
  const frameLabel     = isTopView ? 'PLAN DE SCÈNE'  : 'VUE ÉLÉVATION';
  const axisLabel      = isTopView ? 'Vue de dessus · X × Z' : 'Vue de face · X × Y';
  const axisIcon: React.ComponentProps<typeof Ionicons>['name'] =
    isTopView ? 'grid-outline' : 'layers-outline';
  const itemCountLabel = loading
    ? '—'
    : `${items.length} élément${items.length !== 1 ? 's' : ''}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SyncStatusBanner />

      {/* ── Header toolbar ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Title + subtitle */}
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <Ionicons name="grid-outline" size={14} color="#60a5fa" />
              </View>
              <Text style={styles.title}>Scène 2D</Text>
              {/* Item count badge — right of title */}
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#2563eb"
                  style={styles.loadingIndicator}
                />
              ) : (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{items.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>Plan de scène interactif</Text>
          </View>

          {/* + Créer button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddPickerVisible(true)}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color="#f1f5f9" />
            <Text style={styles.addBtnText}>Créer</Text>
          </TouchableOpacity>
        </View>

        {/* ViewToggle — centered below title row */}
        <View style={styles.toggleRow}>
          <ViewToggle view={viewMode} onChange={setViewMode} />
        </View>
      </View>

      {/* ── Legend strip ─────────────────────────────────────────────────── */}
      <View style={styles.legendContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendRow}
        >
          {/* Axis context badge — leftmost, subtle */}
          <View style={styles.axisBadge}>
            <Ionicons name={axisIcon} size={9} color="#3b82f6" />
            <Text style={styles.axisBadgeText}>{axisLabel}</Text>
          </View>

          <View style={styles.legendDivider} />

          <Text style={styles.legendSectionLabel}>ÉTATS</Text>
          {LEGEND.slice(0, 4).map(l => (
            <View key={l.label} style={styles.legendChip}>
              {l.icon && <Ionicons name={l.icon} size={10} color={l.color} />}
              <Text style={[styles.legendChipText, { color: l.color }]}>{l.label}</Text>
            </View>
          ))}
          <View style={styles.legendDivider} />
          <Text style={styles.legendSectionLabel}>TYPES</Text>
          {LEGEND.slice(4).map(l => (
            <View key={l.label} style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={[styles.legendChipText, { color: l.color }]}>{l.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Canvas area with frame decoration ───────────────────────────── */}
      <View style={styles.canvasFrame}>
        {/* Mini title bar */}
        <View style={styles.canvasFrameHeader}>
          <View style={[styles.canvasFrameDot, isTopView ? styles.dotBlue : styles.dotTeal]} />
          <Text style={[styles.canvasFrameLabel, isTopView ? styles.labelBlue : styles.labelTeal]}>
            {frameLabel}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.canvasFrameCount}>{itemCountLabel}</Text>
        </View>

        {/* Conditional canvas */}
        {isTopView ? (
          <SceneCanvas
            items={items}
            selectedId={selectedId}
            onTapItem={handleTapItem}
            onMoveItem={handleMoveTopView}
            onDeselect={() => setSelectedId(null)}
          />
        ) : (
          <ElevationCanvas
            items={items}
            selectedId={selectedId}
            onTapItem={handleTapItem}
            onMoveItem={handleMoveElevation}
            onDeselect={() => setSelectedId(null)}
          />
        )}
      </View>

      {/* ── Bottom inset spacer ──────────────────────────────────────────── */}
      <View style={{ height: insets.bottom }} />

      {/* ── Edit / delete sheet ─────────────────────────────────────────── */}
      <ItemSheet
        visible={sheetVisible}
        item={selectedItem}
        saving={saving}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => !saving && setSheetVisible(false)}
      />

      {/* ── Add equipment picker modal ───────────────────────────────────── */}
      <Modal
        visible={addPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPickerVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setAddPickerVisible(false)} />
        <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.handle} />

          <View style={styles.pickerHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerTitle}>Ajouter un équipement</Text>
              <Text style={styles.pickerSubtitle}>Choisissez le type à placer sur la scène</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAddPickerVisible(false)}
              style={styles.pickerCloseBtn}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerCards}>
            {ITEM_TYPES.map((opt, index) => (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.pickerCard,
                  index < ITEM_TYPES.length - 1 && styles.pickerCardBorder,
                ]}
                onPress={() => void handleAdd(opt.type)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.pickerIconWrap,
                    { backgroundColor: opt.iconBg, borderColor: opt.color + '40' },
                  ]}
                >
                  <Ionicons name={opt.icon} size={26} color={opt.color} />
                </View>
                <View style={styles.pickerCardText}>
                  <Text style={[styles.pickerCardLabel, { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.pickerCardSubtitle}>{opt.subtitle}</Text>
                </View>
                <View style={[styles.pickerCardArrow, { borderColor: opt.color + '30' }]}>
                  <Ionicons name="add" size={18} color={opt.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563eb40',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: -0.3,
  },
  loadingIndicator: {
    marginLeft: 4,
  },
  countBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 30,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  subtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    marginLeft: 34,
    letterSpacing: 0.2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
    marginLeft: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.1,
  },

  // ── View toggle row ───────────────────────────────────────────────────────
  toggleRow: {
    alignItems: 'center',
  },

  // ── Legend strip ──────────────────────────────────────────────────────────
  legendContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0d1b2e',
  },
  legendRow: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Axis context badge
  axisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d2044',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  axisBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 0.4,
  },

  legendSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 1,
    marginRight: 2,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#263352',
  },
  legendChipText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#1e293b',
    marginHorizontal: 4,
  },

  // ── Canvas frame ──────────────────────────────────────────────────────────
  canvasFrame: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
    backgroundColor: '#060e1a',
  },
  canvasFrameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#0d1f38',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    gap: 7,
  },
  canvasFrameDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotBlue: {
    backgroundColor: '#2563eb',
  },
  dotTeal: {
    backgroundColor: '#0891b2',
  },
  canvasFrameLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  labelBlue: {
    color: '#3b82f6',
  },
  labelTeal: {
    color: '#22d3ee',
  },
  canvasFrameCount: {
    fontSize: 10,
    color: '#334155',
    letterSpacing: 0.2,
  },

  // ── Add picker modal ──────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  pickerSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  pickerCards: {
    marginHorizontal: 16,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
    marginBottom: 8,
  },
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  pickerCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  pickerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pickerCardText: {
    flex: 1,
    gap: 3,
  },
  pickerCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  pickerCardSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  pickerCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
