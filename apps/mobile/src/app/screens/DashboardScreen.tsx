import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { TabScreenProps } from '@app/navigation/types';
import { SyncStatusBanner } from '@features/sync/ui/SyncStatusBanner';
import { StatsGrid } from '@features/dashboard/ui/DashboardCards';
import {
  getDashboardStats,
  getRecentIncidents,
  type DashboardStats,
} from '@features/dashboard/usecases/dashboardUsecases';
import type { Incident } from '@shared/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  ELEVEE: '#ef4444',
  MOYENNE: '#f59e0b',
  FAIBLE: '#22c55e',
};

const SEVERITY_LABEL: Record<string, string> = {
  ELEVEE: 'Élevée',
  MOYENNE: 'Moyenne',
  FAIBLE: 'Faible',
};

function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─────────────────────────────────────────────
// Recent incident row
// ─────────────────────────────────────────────

function IncidentRow({ incident }: { incident: Incident }) {
  const color = SEVERITY_COLOR[incident.severity] ?? '#94a3b8';
  const sevLabel = SEVERITY_LABEL[incident.severity] ?? incident.severity;
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.dot, { backgroundColor: color }]} />
      <View style={rowStyles.info}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {incident.title}
        </Text>
        <Text style={rowStyles.meta}>
          {sevLabel} · {formatTime(incident.created_at)}
        </Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  info: { flex: 1 },
  title: { fontSize: 14, color: '#e2e8f0', fontWeight: '500' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
});

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

type Props = TabScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh every time the tab gains focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      Promise.all([getDashboardStats(), getRecentIncidents(3)])
        .then(([s, r]) => {
          if (!cancelled) {
            setStats(s);
            setRecent(r);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled)
            setError((err as Error).message ?? 'Erreur de chargement');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => { cancelled = true; };
    }, []),
  );

  const navigateToIncidentCreate = () =>
    navigation.navigate('IncidentCreate');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SyncStatusBanner />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tableau de bord</Text>
          <Text style={styles.subtitle}>Matériel &amp; incidents</Text>
        </View>

        {/* Stats cards */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <StatsGrid
            hs={stats?.hs ?? null}
            aVerifier={stats?.aVerifier ?? null}
            operationnels={stats?.operationnels ?? null}
            openIncidents={stats?.openIncidents ?? null}
            loading={loading}
          />
        )}

        {/* Quick actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
            <Ionicons name='qr-code-outline' size={18} color='#e2e8f0' />
            <Text style={styles.actionBtnText}>Scanner QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={navigateToIncidentCreate}
          >
            <Ionicons name='add-circle-outline' size={18} color='#0f172a' />
            <Text style={[styles.actionBtnText, styles.actionBtnTextDark]}>
              Créer incident
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent incidents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incidents récents (24 h)</Text>

          {loading ? (
            <ActivityIndicator
              color='#f97316'
              style={{ marginTop: 16 }}
            />
          ) : recent.length === 0 ? (
            <Text style={styles.emptyText}>Aucun incident ces dernières 24 h</Text>
          ) : (
            recent.map((inc) => (
              <IncidentRow key={inc.id} incident={inc} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnPrimary: {
    backgroundColor: '#38bdf8',
  },
  actionBtnSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  actionBtnTextDark: {
    color: '#0f172a',
  },
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 16,
  },
});

