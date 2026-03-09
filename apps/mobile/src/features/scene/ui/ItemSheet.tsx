import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SceneItem, SceneItemState } from '@shared/types';

// ─────────────────────────────────────────────
// State options
// ─────────────────────────────────────────────

const STATE_OPTIONS: { value: SceneItemState; label: string; color: string; bg: string }[] = [
  { value: 'ok',            label: 'OK',            color: '#86efac', bg: '#14532d' },
  { value: 'a_verifier',    label: 'À vérifier',    color: '#fcd34d', bg: '#451a03' },
  { value: 'hors_service',  label: 'Hors service',  color: '#fca5a5', bg: '#450a0a' },
  { value: 'en_reparation', label: 'En réparation', color: '#7dd3fc', bg: '#0c2240' },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Props {
  visible: boolean;
  item: SceneItem | null;
  saving: boolean;
  onSave: (label: string, state: SceneItemState) => void;
  onDelete: () => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ItemSheet({ visible, item, saving, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState('');
  const [state, setState] = useState<SceneItemState>('ok');

  // Sync form when selected item changes
  useEffect(() => {
    if (item) {
      setLabel(item.label);
      setState(item.state);
    }
  }, [item?.id]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={() => !saving && onClose()} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item ? `Modifier — ${item.label}` : 'Équipement'}</Text>
          <TouchableOpacity onPress={() => !saving && onClose()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Label */}
        <Text style={styles.fieldLabel}>Nom</Text>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="Nom de l'équipement"
          placeholderTextColor="#475569"
          editable={!saving}
          maxLength={40}
          returnKeyType="done"
        />

        {/* State picker */}
        <Text style={styles.fieldLabel}>État</Text>
        <View style={styles.stateGrid}>
          {STATE_OPTIONS.map(opt => {
            const active = opt.value === state;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.stateRow, active && { backgroundColor: opt.bg, borderRadius: 10 }]}
                onPress={() => setState(opt.value)}
                disabled={saving}
                activeOpacity={0.75}
              >
                <View style={[styles.stateDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.stateLabel, active && { color: opt.color, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={16} color={opt.color} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.deleteBtn]}
            onPress={onDelete}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={styles.deleteBtnText}>Supprimer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => !saving && onSave(label, state)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#f1f5f9" />
            ) : (
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
  },
  sheet: {
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
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
    marginRight: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#e2e8f0',
    marginBottom: 14,
  },
  stateGrid: {
    gap: 2,
    marginBottom: 20,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  stateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stateLabel: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
});
