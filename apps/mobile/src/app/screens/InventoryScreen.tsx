import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import type { TabScreenProps } from '@app/navigation/types';
import { SyncStatusBanner } from '@features/sync/ui/SyncStatusBanner';
import { EquipmentFilters } from '@features/inventory/ui/EquipmentFilters';
import { EquipmentList } from '@features/inventory/ui/EquipmentList';
import {
  getFilteredEquipment,
  EMPTY_FILTER,
  type InventoryFilter,
} from '@features/inventory/usecases/inventoryUsecases';
import type { Equipment } from '@shared/types';

type Props = TabScreenProps<'Inventory'>;

export function InventoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<InventoryFilter>(EMPTY_FILTER);
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload whenever the filter changes or the tab regains focus
  const load = useCallback((f: InventoryFilter) => {
    setLoading(true);
    getFilteredEquipment(f)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // First load + re-load on tab focus
  useFocusEffect(
    useCallback(() => {
      load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const handleFilterChange = (next: InventoryFilter) => {
    setFilter(next);
    load(next);
  };

  const handlePress = (equipmentId: string) =>
    navigation.navigate('EquipmentDetails', { equipmentId });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SyncStatusBanner />

      <View style={styles.header}>
        <Text style={styles.title}>Inventaire</Text>
        <Text style={styles.count}>
          {loading ? '…' : `${items.length} équipement${items.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      <View style={styles.filtersWrapper}>
        <EquipmentFilters filter={filter} onChange={handleFilterChange} />
      </View>

      <View style={styles.listWrapper}>
        <EquipmentList items={items} loading={loading} onPress={handlePress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  count: {
    fontSize: 13,
    color: '#475569',
  },
  filtersWrapper: {
    paddingHorizontal: 16,
  },
  listWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

