import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TabScreenProps } from '@app/navigation/types';

type Props = TabScreenProps<'Settings'>;

export function SettingsPlaceholderScreen(_: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Réglages</Text>
      <Text style={styles.subtitle}>Configuration de l’application</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API</Text>
        <Text style={styles.sectionValue}>https://api.stageops.app</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Version</Text>
        <Text style={styles.sectionValue}>1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mode</Text>
        <Text style={styles.sectionValue}>Offline-first</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionValue: { fontSize: 15, color: '#111827', fontWeight: '500', marginTop: 2 },
});
