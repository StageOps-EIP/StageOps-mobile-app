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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { SceneItem, SceneItemState, SceneItemType } from '@shared/types';

const STATE_OPTIONS: {
  value: SceneItemState;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  borderColor: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    value: 'ok',
    label: 'OK',
    sublabel: 'Opérationnel',
    color: '#22c55e',
    bg: '#052e16',
    borderColor: '#16a34a',
    icon: 'checkmark-circle',
  },
  {
    value: 'a_verifier',
    label: 'À vérifier',
    sublabel: 'Contrôle requis',
    color: '#f59e0b',
    bg: '#1a0f00',
    borderColor: '#d97706',
    icon: 'alert-circle',
  },
  {
    value: 'hors_service',
    label: 'Hors service',
    sublabel: 'Indisponible',
    color: '#ef4444',
    bg: '#1a0404',
    borderColor: '#dc2626',
    icon: 'close-circle',
  },
  {
    value: 'en_reparation',
    label: 'En réparation',
    sublabel: 'En cours de maintenance',
    color: '#38bdf8',
    bg: '#041928',
    borderColor: '#0284c7',
    icon: 'build',
  },
];

const TYPE_META: Record<SceneItemType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  light:   { label: 'Lumière',  icon: 'flashlight-outline',  color: '#fbbf24', bg: '#1c1200' },
  camera:  { label: 'Caméra',   icon: 'videocam-outline',    color: '#60a5fa', bg: '#071428' },
  speaker: { label: 'Enceinte', icon: 'volume-high-outline', color: '#a78bfa', bg: '#150d28' },
};

interface Props {
  visible: boolean;
  item: SceneItem | null;
  saving: boolean;
  onSave: (label: string, state: SceneItemState) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ItemSheet({ visible, item, saving, onSave, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [state, setState] = useState<SceneItemState>('ok');

  useEffect(() => {
    if (item) {
      setLabel(item.label);
      setState(item.state);
    }
  }, [item?.id]);

  const typeMeta = item ? TYPE_META[item.type] : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={() => !saving && onClose()} />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Type badge + close button row */}
        <View style={styles.topRow}>
          {typeMeta && (
            <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg, borderColor: typeMeta.color + '40' }]}>
              <Ionicons name={typeMeta.icon} size={14} color={typeMeta.color} />
              <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
                {typeMeta.label.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => !saving && onClose()}
            style={styles.closeBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Item name display */}
        <Text style={styles.itemName} numberOfLines={1}>
          {item?.label || 'Équipement'}
        </Text>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Name field */}
        <Text style={styles.fieldLabel}>NOM DE L'ÉQUIPEMENT</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="pencil-outline" size={16} color="#475569" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex : Projecteur principal"
            placeholderTextColor="#334155"
            editable={!saving}
            maxLength={40}
            returnKeyType="done"
          />
        </View>

        {/* State picker — 2×2 grid */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>ÉTAT</Text>
        <View style={styles.stateGrid}>
          {[STATE_OPTIONS.slice(0, 2), STATE_OPTIONS.slice(2, 4)].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.stateRow}>
              {row.map(opt => {
                const active = opt.value === state;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.stateCard,
                      active
                        ? { backgroundColor: opt.bg, borderColor: opt.borderColor }
                        : { backgroundColor: '#0f172a', borderColor: '#1e293b' },
                    ]}
                    onPress={() => setState(opt.value)}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={22}
                      color={active ? opt.color : '#334155'}
                    />
                    <Text style={[styles.stateCardLabel, active && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.stateCardSublabel, active && { color: opt.color + 'aa' }]}>
                      {opt.sublabel}
                    </Text>
                    {active && (
                      <View style={[styles.stateCardCheck, { backgroundColor: opt.color }]}>
                        <Ionicons name="checkmark" size={9} color="#000" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={() => !saving && onSave(label, state)}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#f1f5f9" />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={17} color="#f1f5f9" />
              <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
          <Text style={styles.deleteBtnText}>Supprimer cet équipement</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
    marginBottom: 16,
  },

  // ── Top row (type badge + close) ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  // ── Field label ──
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  // ── Input ──
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIcon: {},
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: '#e2e8f0',
  },

  // ── State 2x2 grid ──
  stateGrid: {
    gap: 8,
    marginBottom: 20,
  },
  stateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stateCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    position: 'relative',
  },
  stateCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  stateCardSublabel: {
    fontSize: 10,
    color: '#334155',
    letterSpacing: 0.1,
  },
  stateCardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Save button ──
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.1,
  },

  // ── Delete button ──
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef444430',
    backgroundColor: '#1a040420',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
});
