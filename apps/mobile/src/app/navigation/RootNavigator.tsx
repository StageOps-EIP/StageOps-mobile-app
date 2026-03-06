import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { EquipmentDetailsScreen } from '@app/screens/EquipmentDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Main tabs */}
          <Stack.Screen name="Tabs" component={TabNavigator} />

          {/* Detail screens pushed on top of tabs */}
          <Stack.Screen
            name="EquipmentDetails"
            component={EquipmentDetailsScreen}
            options={{ headerShown: true, title: 'Équipement' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
