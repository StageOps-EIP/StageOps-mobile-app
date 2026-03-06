import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from '@app/navigation/RootNavigator';
import { AppProviders } from '@app/AppProviders';

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
