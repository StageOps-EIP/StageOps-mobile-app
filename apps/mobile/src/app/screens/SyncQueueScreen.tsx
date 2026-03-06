import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { TabScreenProps } from '@app/navigation/types';
import { getAllEvents, resetEvent } from '@infra/db/repos/outboxRepo';
import { syncNow, isSyncing } from '@infra/sync/syncEngine';
import type { OutboxEvent, OutboxStatus } from '@shared/types';

// ─────────────────────────────────────────────
// Metadata maps
// ─────────────────────────────────────────────

const STATUS_META: Record<OutboxStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'En attente', color: '#fcd34d', bg: '#451a03' },
  SENT:    { label: 'Envoyé',     color: '#86efac', bg: '#14532d' },
  FAILED:  { label: 'Échoué',     color: '#fca5a5', bg: '#450a0a' },
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  INCIDENT_CREATE:          'Incident créé',
  INCIDENT_UPDATE:          'Incident modifié',
  EQUIPMENT_UPDATE_STATUS:  'Statut équipement',
  EQUIPMENT_UPDATE:         'Équipement modifié',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatAge(epochMs: number): string {
  const diff = Math.max(0, Date.now() - epochMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

// ─────────────────────────────────────────────
// Event row
// ─────────────────────────────────────────────

function EventRow({
  item,
  onReset,
  resetting,
}: {
  item: OutboxEvent;
  onReset: (id: string) => void;
  resetting: boolean;
}) {
  const meta = STATUS_META[item.status];
  const typeLabel = EVENT_TYPE_LABEL[item.type] ?? item.type;

  return (
    <View style={rowStyles.card}>
      {/* Top row */}
      <View style={rowStyles.top}>
        <Text style={rowStyles.type} numberOfLines={1}>
          {typeLabel}
        </Text>
        <View style={[rowStyles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[rowStyles.badgeText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={rowStyles.metaRow}>
        <Ionicons name='time-outline' size={12} color='#475569' />
        <Text style={rowStyles.metaText}>il y a {formatAge(item.created_at)}</Text>
        <Text style={rowStyles.sep}>·</Text>
        <Ionicons name='refresh-outline' size={12} color='#475569' />
        <Text style={rowStyles.metaText}>
          {item.attempt_count} essai{item.attempt_count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Error */}
      {item.last_error && (
        <Text style={rowStyles.error} numberOfLines={2}>
          {item.last_error}
        </Text>
      )}

      {/* Per-row reset button for FAILED events */}
      {item.status === 'FAILED' && (
        <TouchableOpacity
          style={rowStyles.resetBtn}
          onPress={() => onReset(item.event_id)}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator size='small' color='#38bdf8' />
          ) : (
            <>
              <Ionicons name='refresh' size={13} color='#38bdf8' />
              <Text style={rowStyles.resetBtnText}>Remettre en attente</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  type: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  sep: {
    fontSize: 12,
    color: '#334155',
    marginHorizontal: 2,
  },
  error: {
    fontSize: 12,
    color: '#f87171',
    backgroundColor: '#450a0a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    backgroundColor: '#0c2240',
  },
  resetBtnText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
});

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────

function EmptyState({ loading }: { loading: boolean }) {
  if (loading) return null;
  return (
    <View style={emptyStyles.wrapper}>
      <Ionicons name='checkmark-circle-outline' size={44} color='#22c55e' />
      <Text style={emptyStyles.title}>File vide</Text>
      <Text style={emptyStyles.sub}>
        Tous les événements ont été synchronisés.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingTop: 72, gap: 10 },
  title:   { fontSize: 16, fontWeight: '600', color: '#e2e8f0' },
  sub:     { fontSize: 13, color: '#475569', textAlign: 'center' },
});

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

type Props = TabScreenProps<'SyncQueue'>;

export function SyncQueueScreen(_: Props) {
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllEvents();
      setEvents(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Summary counts
  const pending = events.filter((e) => e.status === 'PENDING').length;
  const failed  = events.filter((e) => e.status === 'FAILED').length;
  const sent    = events.filter((e) => e.status === 'SENT').length;

  const handleSyncNow = async () => {
    if (isSyncing() || syncing) return;
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
      await load();
    }
  };

  const handleReset = async (eventId: string) => {
    setResettingId(eventId);
    try {
      await resetEvent(eventId);
      await load();
    } finally {
      setResettingId(null);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<OutboxEvent>) => (
    <EventRow
      item={item}
      onReset={handleReset}
      resetting={resettingId === item.event_id}
    />
  );

  return (
    <View style={[screenStyles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={screenStyles.header}>
        <View>
          <Text style={screenStyles.title}>File de sync</Text>
          {!loading && (
            <Text style={screenStyles.subtitle}>
              {pending} en attente · {failed} échoué{failed !== 1 ? 's' : ''} · {sent} envoyé{sent !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[screenStyles.syncBtn, (syncing || loading) && screenStyles.syncBtnDisabled]}
          onPress={handleSyncNow}
          disabled={syncing || loading}
        >
          {syncing ? (
            <ActivityIndicator size='small' color='#0f172a' />
          ) : (
            <>
              <Ionicons name='cloud-upload-outline' size={16} color='#0f172a' />
              <Text style={screenStyles.syncBtnText}>Réessayer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color='#38bdf8' size='large' style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.event_id}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState loading={loading} />}
          contentContainerStyle={screenStyles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    minWidth: 100,
    justifyContent: 'center',
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
