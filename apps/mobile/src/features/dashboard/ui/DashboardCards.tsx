import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  count: number | null;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

// ─────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────

export function StatCard({ label, count, accent, icon, loading }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={[styles.iconWrapper, { backgroundColor: accent + '22' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      {loading || count === null ? (
        <ActivityIndicator size='small' color={accent} style={styles.loader} />
      ) : (
        <Text style={[styles.count, { color: accent }]}>{count}</Text>
      )}
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// StatsGrid — 2 × 2 layout
// ─────────────────────────────────────────────

interface StatsGridProps {
  hs: number | null;
  aVerifier: number | null;
  operationnels: number | null;
  openIncidents: number | null;
  loading?: boolean;
}

export function StatsGrid({
  hs,
  aVerifier,
  operationnels,
  openIncidents,
  loading,
}: StatsGridProps) {
  return (
    <View style={styles.grid}>
      <StatCard
        label='Équipements HS'
        count={hs}
        accent='#ef4444'
        icon='warning-outline'
        loading={loading}
      />
      <StatCard
        label='À vérifier'
        count={aVerifier}
        accent='#f59e0b'
        icon='time-outline'
        loading={loading}
      />
      <StatCard
        label='Opérationnels'
        count={operationnels}
        accent='#22c55e'
        icon='checkmark-circle-outline'
        loading={loading}
      />
      <StatCard
        label='Incidents ouverts'
        count={openIncidents}
        accent='#f97316'
        icon='flame-outline'
        loading={loading}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    gap: 6,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  count: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

