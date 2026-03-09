import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ────────────────────────────────────────────────
// Root Stack
// ────────────────────────────────────────────────
export type RootStackParamList = {
  Tabs: undefined;
  EquipmentDetails: { equipmentId: string };
};

// ────────────────────────────────────────────────
// Bottom Tabs
// ────────────────────────────────────────────────
export type TabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  Scene: undefined;
  IncidentCreate: { equipmentId?: string } | undefined;
  SyncQueue: undefined;
  Settings: undefined;
};

// ────────────────────────────────────────────────
// Typed screen props helpers
// ────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Global type augmentation for useNavigation()
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
