import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EquipmentStatus, EquipmentCategory } from '@shared/types';
import type { InventoryFilter } from '../usecases/inventoryUsecases';

// ─────────────────────────────────────────────
// Chip data
// ─────────────────────────────────────────────

const STATUS_CHIPS: { value: EquipmentStatus | null; label: string; color: string }[] = [
  { value: null,           label: 'Tous',          color: '#64748b' },
  { value: 'OK',           label: 'OK',            color: '#22c55e' },
  { value: 'A_VERIFIER',   label: 'À vérifier',    color: '#f59e0b' },
  { value: 'HS',           label: 'HS',            color: '#ef4444' },
  { value: 'EN_REPARATION',label: 'En réparation', color: '#38bdf8' },
];

const CATEGORY_CHIPS: { value: EquipmentCategory | null; label: string }[] = [
  { value: null,       label: 'Tout' },
  { value: 'SON',      label: 'Son' },
  { value: 'LUMIERE',  label: 'Lumière' },
  { value: 'VIDEO',    label: 'Vidéo' },
  { value: 'PLATEAU',  label: 'Plateau' },
  { value: 'SECURITE', label: 'Sécu' },
  { value: 'ACCROCHE', label: 'Accroche' },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Chip({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent?: string;
  onPress: () => void;
}) {
  const accentColor = accent ?? '#64748b';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        chipStyles.chip,
        active && { backgroundColor: accentColor + '22', borderColor: accentColor },
      ]}
    >
      <Text
        style={[
          chipStyles.label,
          active && { color: accentColor, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────
// EquipmentFilters
// ─────────────────────────────────────────────

interface Props {
  filter: InventoryFilter;
  onChange: (next: InventoryFilter) => void;
}

export function EquipmentFilters({ filter, onChange }: Props) {
  return (
    <View style={styles.wrapper}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name='search-outline' size={16} color='#64748b' style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder='Rechercher…'
          placeholderTextColor='#475569'
          value={filter.search}
          onChangeText={(t) => onChange({ ...filter, search: t })}
          returnKeyType='search'
          clearButtonMode='while-editing'
          autoCorrect={false}
          autoCapitalize='none'
        />
        {filter.search.length > 0 && (
          <TouchableOpacity onPress={() => onChange({ ...filter, search: '' })}>
            <Ionicons name='close-circle' size={16} color='#64748b' />
          </TouchableOpacity>
        )}
      </View>

      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {STATUS_CHIPS.map((chip) => (
          <Chip
            key={chip.value ?? '_all_status'}
            label={chip.label}
            accent={chip.color}
            active={filter.status === chip.value}
            onPress={() => onChange({ ...filter, status: chip.value })}
          />
        ))}
      </ScrollView>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORY_CHIPS.map((chip) => (
          <Chip
            key={chip.value ?? '_all_cat'}
            label={chip.label}
            active={filter.category === chip.value}
            onPress={() => onChange({ ...filter, category: chip.value })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
  },
});
