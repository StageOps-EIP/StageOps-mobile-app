import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import type { TabParamList } from './types';
import { DashboardScreen } from '@app/screens/DashboardScreen';
import { InventoryScreen } from '@app/screens/InventoryScreen';
import { IncidentCreateScreen } from '@app/screens/IncidentCreateScreen';
import { SyncQueueScreen } from '@app/screens/SyncQueueScreen';
import { SettingsPlaceholderScreen } from '@app/screens/SettingsPlaceholderScreen';

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof TabParamList, { focused: IoniconsName; unfocused: IoniconsName }> = {
  Dashboard: { focused: 'grid', unfocused: 'grid-outline' },
  Inventory: { focused: 'cube', unfocused: 'cube-outline' },
  IncidentCreate: { focused: 'warning', unfocused: 'warning-outline' },
  SyncQueue: { focused: 'sync-circle', unfocused: 'sync-circle-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventaire' }} />
      <Tab.Screen
        name="IncidentCreate"
        component={IncidentCreateScreen}
        options={{ title: 'Incident' }}
      />
      <Tab.Screen name="SyncQueue" component={SyncQueueScreen} options={{ title: 'Sync' }} />
      <Tab.Screen
        name="Settings"
        component={SettingsPlaceholderScreen}
        options={{ title: 'Réglages' }}
      />
    </Tab.Navigator>
  );
}
