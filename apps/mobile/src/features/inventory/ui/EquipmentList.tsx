import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Equipment, EquipmentStatus, EquipmentCategory } from '@shared/types';

// ─────────────────────────────────────────────
// Badge maps
// ─────────────────────────────────────────────

const STATUS_META: Record<EquipmentStatus, { label: string; bg: string; fg: string }> = {
  OK:            { label: 'OK',            bg: '#14532d', fg: '#86efac' },
  A_VERIFIER:    { label: 'À vérifier',    bg: '#451a03', fg: '#fcd34d' },
  HS:            { label: 'HS',            bg: '#450a0a', fg: '#fca5a5' },
  EN_REPARATION: { label: 'En réparation', bg: '#0c2240', fg: '#7dd3fc' },
};

const CATEGORY_META: Record<EquipmentCategory, { label: string; bg: string; fg: string }> = {
  SON:      { label: 'Son',      bg: '#2e1065', fg: '#c4b5fd' },
  LUMIERE:  { label: 'Lumière',  bg: '#1c1917', fg: '#fde68a' },
  VIDEO:    { label: 'Vidéo',    bg: '#042f2e', fg: '#5eead4' },
  PLATEAU:  { label: 'Plateau',  bg: '#0f172a', fg: '#94a3b8' },
  SECURITE: { label: 'Sécu',     bg: '#450a0a', fg: '#fca5a5' },
  ACCROCHE: { label: 'Accroche', bg: '#1c1917', fg: '#d6d3d1' },
};

// ─────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[badgeStyles.pill, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────
// Equipment row
// ─────────────────────────────────────────────

function EquipmentRow({
  item,
  onPress,
}: {
  item: Equipment;
  onPress: (id: string) => void;
}) {
  const statusMeta = STATUS_META[item.status];
  const catMeta = CATEGORY_META[item.category];

  return (
    <TouchableOpacity
      style={rowStyles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      <View style={rowStyles.top}>
        <Text style={rowStyles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Ionicons name='chevron-forward' size={16} color='#475569' />
      </View>

      <View style={rowStyles.badgeRow}>
        <Badge label={catMeta.label} bg={catMeta.bg} fg={catMeta.fg} />
        <Badge label={statusMeta.label} bg={statusMeta.bg} fg={statusMeta.fg} />
      </View>

      <View style={rowStyles.locationRow}>
        <Ionicons name='location-outline' size={13} color='#64748b' />
        <Text style={rowStyles.location} numberOfLines={1}>
          {item.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
});

// ─────────────────────────────────────────────
// EquipmentList
// ─────────────────────────────────────────────

interface Props {
  items: Equipment[];
  loading: boolean;
  onPress: (id: string) => void;
}

function EmptyState({ loading }: { loading: boolean }) {
  if (loading) return null;
  return (
    <View style={emptyStyles.wrapper}>
      <Ionicons name='cube-outline' size={40} color='#334155' />
      <Text style={emptyStyles.text}>Aucun équipement trouvé</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingTop: 60, gap: 12 },
  text: { fontSize: 14, color: '#475569' },
});

function renderItem(
  info: ListRenderItemInfo<Equipment>,
  onPress: (id: string) => void,
) {
  return <EquipmentRow item={info.item} onPress={onPress} />;
}

export function EquipmentList({ items, loading, onPress }: Props) {
  if (loading) {
    return (
      <ActivityIndicator
        color='#38bdf8'
        size='large'
        style={{ marginTop: 60 }}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={(info) => renderItem(info, onPress)}
      ListEmptyComponent={<EmptyState loading={loading} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={listStyles.content}
      keyboardShouldPersistTaps='handled'
      keyboardDismissMode='on-drag'
    />
  );
}

const listStyles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 32 },
});
