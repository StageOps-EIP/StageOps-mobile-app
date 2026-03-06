import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackScreenProps } from '@app/navigation/types';
import {
  fetchEquipmentById,
  updateEquipmentStatus,
} from '@features/inventory/usecases/inventoryUsecases';
import type { Equipment, EquipmentStatus } from '@shared/types';

// ─────────────────────────────────────────────
// Status metadata
// ─────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: EquipmentStatus;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: 'OK',            label: 'OK',            color: '#86efac', bg: '#14532d' },
  { value: 'A_VERIFIER',    label: 'À vérifier',    color: '#fcd34d', bg: '#451a03' },
  { value: 'HS',            label: 'Hors service',  color: '#fca5a5', bg: '#450a0a' },
  { value: 'EN_REPARATION', label: 'En réparation', color: '#7dd3fc', bg: '#0c2240' },
];

function getStatusMeta(s: EquipmentStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0];
}

// ─────────────────────────────────────────────
// StatusPicker modal
// ─────────────────────────────────────────────

function StatusPickerModal({
  visible,
  current,
  saving,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: EquipmentStatus;
  saving: boolean;
  onSelect: (s: EquipmentStatus) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.sheetTitle}>Changer le statut</Text>
        {STATUS_OPTIONS.map((opt) => {
          const isActive = opt.value === current;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                pickerStyles.option,
                isActive && { backgroundColor: opt.bg },
              ]}
              onPress={() => onSelect(opt.value)}
              disabled={saving}
            >
              <View style={[pickerStyles.dot, { backgroundColor: opt.color }]} />
              <Text
                style={[
                  pickerStyles.optionLabel,
                  isActive && { color: opt.color, fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
              {isActive && !saving && (
                <Ionicons name='checkmark' size={18} color={opt.color} />
              )}
              {isActive && saving && (
                <ActivityIndicator size='small' color={opt.color} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    gap: 4,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────
// Field row
// ─────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={fieldStyles.row}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Text style={fieldStyles.value}>{value}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

type Props = RootStackScreenProps<'EquipmentDetails'>;

export function EquipmentDetailsScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { equipmentId } = route.params;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load equipment on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setNotFound(false);
      fetchEquipmentById(equipmentId)
        .then((eq) => {
          if (cancelled) return;
          if (!eq) { setNotFound(true); }
          else { setEquipment(eq); }
        })
        .catch(() => { if (!cancelled) setNotFound(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [equipmentId]),
  );

  const handleStatusSelect = async (newStatus: EquipmentStatus) => {
    if (!equipment || newStatus === equipment.status) {
      setPickerOpen(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateEquipmentStatus(equipment.id, newStatus);
      setEquipment(updated);
      setPickerOpen(false);
    } catch (err) {
      setSaveError((err as Error).message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleReportIncident = () => {
    navigation.navigate('Tabs', {
      screen: 'IncidentCreate',
      params: { equipmentId },
    } as never);
  };

  // ── Loading / error states
  if (loading) {
    return (
      <View style={[screenStyles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color='#38bdf8' size='large' />
      </View>
    );
  }

  if (notFound || !equipment) {
    return (
      <View style={[screenStyles.centered, { paddingTop: insets.top }]}>
        <Ionicons name='cube-outline' size={40} color='#334155' />
        <Text style={screenStyles.notFoundText}>Équipement introuvable</Text>
      </View>
    );
  }

  const statusMeta = getStatusMeta(equipment.status);

  return (
    <>
      <ScrollView
        style={{ backgroundColor: '#0f172a' }}
        contentContainerStyle={[
          screenStyles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Name + status badge */}
        <View style={screenStyles.nameRow}>
          <Text style={screenStyles.name}>{equipment.name}</Text>
          <View style={[screenStyles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[screenStyles.statusLabel, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        {/* Fields */}
        <View style={screenStyles.card}>
          <Field label='Localisation' value={equipment.location} />
          <Field label='Catégorie'    value={equipment.category} />
          <Field label='QR Code'      value={equipment.qr_code} />
          {equipment.responsible_name && (
            <Field label='Responsable' value={equipment.responsible_name} />
          )}
          {equipment.notes && (
            <Field label='Notes' value={equipment.notes} />
          )}
        </View>

        {/* Save error */}
        {saveError && (
          <Text style={screenStyles.errorText}>{saveError}</Text>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          screenStyles.actionBar,
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        <TouchableOpacity
          style={[screenStyles.btn, screenStyles.btnSecondary]}
          onPress={() => setPickerOpen(true)}
        >
          <Ionicons name='swap-horizontal-outline' size={18} color='#e2e8f0' />
          <Text style={screenStyles.btnText}>Changer statut</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[screenStyles.btn, screenStyles.btnDanger]}
          onPress={handleReportIncident}
        >
          <Ionicons name='flame-outline' size={18} color='#0f172a' />
          <Text style={[screenStyles.btnText, screenStyles.btnTextDark]}>
            Signaler incident
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status picker sheet */}
      <StatusPickerModal
        visible={pickerOpen}
        current={equipment.status}
        saving={saving}
        onSelect={handleStatusSelect}
        onClose={() => !saving && setPickerOpen(false)}
      />
    </>
  );
}

const screenStyles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: '#475569',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnDanger: {
    backgroundColor: '#f97316',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  btnTextDark: {
    color: '#0f172a',
  },
});
