import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { TabScreenProps } from '@app/navigation/types';
import { IncidentForm } from '@features/incidents/ui/IncidentForm';
import { createIncident } from '@features/incidents/usecases/incidentUsecases';
import type { CreateIncidentInput } from '@features/incidents/usecases/incidentUsecases';

type Props = TabScreenProps<'IncidentCreate'>;

export function IncidentCreateScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const prefillEquipmentId = route.params?.equipmentId ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: CreateIncidentInput) => {
    setSubmitting(true);
    setError(null);
    try {
      await createIncident(input);
      // Navigate to Dashboard and show a success alert
      navigation.navigate('Dashboard');
      // Slight delay so navigation completes before alert appears
      setTimeout(() => {
        Alert.alert('Incident créé', `"${input.title}" a été enregistré et sera synchronisé.`);
      }, 300);
    } catch (err) {
      setError((err as Error).message ?? 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps='handled'
      keyboardDismissMode='on-drag'
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name='flame-outline' size={22} color='#f97316' />
        <Text style={styles.title}>Déclarer un incident</Text>
      </View>

      <IncidentForm
        initialEquipmentId={prefillEquipmentId}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
});
