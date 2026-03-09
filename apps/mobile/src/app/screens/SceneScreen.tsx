import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { TabScreenProps } from '@app/navigation/types';
import { SyncStatusBanner } from '@features/sync/ui/SyncStatusBanner';
import { SceneCanvas } from '@features/scene/ui/SceneCanvas';
import { ItemSheet } from '@features/scene/ui/ItemSheet';
import {
  loadItems,
  addItem,
  moveItem,
  saveItemInfo,
  removeItem,
} from '@features/scene/usecases/sceneUsecases';
import type { SceneItem, SceneItemType, SceneItemState } from '@shared/types';

type Props = TabScreenProps<'Scene'>;

// ─────────────────────────────────────────────
// Equipment type picker options
// ─────────────────────────────────────────────

const ITEM_TYPES: { type: SceneItemType; label: string; emoji: string; color: string }[] = [
  { type: 'light',   label: 'Lumière', emoji: '💡', color: '#fbbf24' },
  { type: 'camera',  label: 'Caméra',  emoji: '📷', color: '#60a5fa' },
  { type: 'speaker', label: 'Enceinte',emoji: '🔊', color: '#a78bfa' },
];

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

export function SceneScreen(_props: Props) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<SceneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Edit sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add picker modal
  const [addPickerVisible, setAddPickerVisible] = useState(false);

  const selectedItem = items.find(i => i.id === selectedId) ?? null;

  // ── Load items when the tab is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadItems()
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, []),
  );

  // ── Tap on an item: select it and open the edit sheet
  const handleTapItem = (id: string) => {
    setSelectedId(id);
    setSheetVisible(true);
  };

  // ── Drag end: update position optimistically then persist
  const handleMoveItem = (id: string, x: number, y: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, x, y } : item));
    void moveItem(id, x, y);
  };

  // ── Add new item
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

  // ── Save edits from sheet
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
      // silent — sheet stays open for retry
    } finally {
      setSaving(false);
    }
  };

  // ── Delete selected item
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SyncStatusBanner />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Scène</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Chargement…' : `${items.length} équipement${items.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddPickerVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#f1f5f9" />
          <Text style={styles.addBtnText}>Créer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Legend ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.legendRow}
      >
        {LEGEND.map(l => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Canvas (fills all remaining space) ── */}
      <SceneCanvas
        items={items}
        selectedId={selectedId}
        onTapItem={handleTapItem}
        onMoveItem={handleMoveItem}
        onDeselect={() => setSelectedId(null)}
      />

      {/* ── Bottom inset spacer ── */}
      <View style={{ height: insets.bottom }} />

      {/* ── Edit / delete sheet ── */}
      <ItemSheet
        visible={sheetVisible}
        item={selectedItem}
        saving={saving}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => !saving && setSheetVisible(false)}
      />

      {/* ── Add equipment picker ── */}
      <Modal
        visible={addPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPickerVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setAddPickerVisible(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.handle} />
          <Text style={styles.pickerTitle}>Ajouter un équipement</Text>
          {ITEM_TYPES.map(opt => (
            <TouchableOpacity
              key={opt.type}
              style={styles.pickerRow}
              onPress={() => void handleAdd(opt.type)}
              activeOpacity={0.75}
            >
              <Text style={styles.pickerEmoji}>{opt.emoji}</Text>
              <Text style={[styles.pickerLabel, { color: opt.color }]}>{opt.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#475569" />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────

const LEGEND = [
  { label: 'OK',            color: '#22c55e' },
  { label: 'À vérifier',   color: '#f59e0b' },
  { label: 'Hors service',  color: '#ef4444' },
  { label: 'En réparation', color: '#38bdf8' },
  { label: 'Lumière',       color: '#fbbf24' },
  { label: 'Caméra',        color: '#60a5fa' },
  { label: 'Enceinte',      color: '#a78bfa' },
];

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  legendRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
  },
  pickerSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerEmoji: {
    fontSize: 26,
    width: 36,
    textAlign: 'center',
  },
  pickerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
