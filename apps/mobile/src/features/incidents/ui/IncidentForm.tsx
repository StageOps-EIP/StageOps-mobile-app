import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import type { IncidentSeverity } from '@shared/types';
import type { CreateIncidentInput } from '../usecases/incidentUsecases';

// ─────────────────────────────────────────────
// Severity chips
// ─────────────────────────────────────────────

const SEVERITY_OPTIONS: {
  value: IncidentSeverity;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: 'FAIBLE',  label: 'Faible',  color: '#86efac', bg: '#14532d' },
  { value: 'MOYENNE', label: 'Moyenne', color: '#fcd34d', bg: '#451a03' },
  { value: 'ELEVEE',  label: 'Élevée',  color: '#fca5a5', bg: '#450a0a' },
];

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

export interface IncidentFormState {
  title: string;
  severity: IncidentSeverity;
  description: string;
}

export const EMPTY_FORM: IncidentFormState = {
  title: '',
  severity: 'MOYENNE',
  description: '',
};

interface Props {
  initialEquipmentId?: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: CreateIncidentInput) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function IncidentForm({ initialEquipmentId, submitting, error, onSubmit }: Props) {
  const [form, setForm] = useState<IncidentFormState>(EMPTY_FORM);
  const [equipmentId, setEquipmentId] = useState(initialEquipmentId ?? '');

  const set = <K extends keyof IncidentFormState>(key: K, value: IncidentFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = form.title.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: form.title,
      severity: form.severity,
      description: form.description,
      equipment_id: equipmentId.trim() || undefined,
    });
  };

  return (
    <View style={styles.wrapper}>
      {/* Equipment field */}
      <Text style={styles.label}>Équipement concerné</Text>
      <TextInput
        style={styles.input}
        value={equipmentId}
        onChangeText={setEquipmentId}
        placeholder='ID équipement (optionnel)'
        placeholderTextColor='#475569'
        autoCorrect={false}
        autoCapitalize='none'
        editable={!submitting}
      />

      {/* Title */}
      <Text style={styles.label}>Titre *</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={(v) => set('title', v)}
        placeholder='Ex : Console lumière HS'
        placeholderTextColor='#475569'
        returnKeyType='next'
        editable={!submitting}
      />

      {/* Severity */}
      <Text style={styles.label}>Sévérité</Text>
      <View style={styles.severityRow}>
        {SEVERITY_OPTIONS.map((opt) => {
          const active = form.severity === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.severityChip,
                active && { backgroundColor: opt.bg, borderColor: opt.color },
              ]}
              onPress={() => set('severity', opt.value)}
              disabled={submitting}
            >
              <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
              <Text
                style={[
                  styles.severityLabel,
                  active && { color: opt.color, fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={form.description}
        onChangeText={(v) => set('description', v)}
        placeholder="Détail de l'incident…"
        placeholderTextColor='#475569'
        multiline
        numberOfLines={4}
        textAlignVertical='top'
        editable={!submitting}
      />

      {/* Error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color='#0f172a' size='small' />
        ) : (
          <Text style={styles.buttonText}>Enregistrer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#e2e8f0',
  },
  textarea: {
    height: 110,
    textAlignVertical: 'top',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#f87171',
    textAlign: 'center',
  },
  button: {
    marginTop: 28,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
});

