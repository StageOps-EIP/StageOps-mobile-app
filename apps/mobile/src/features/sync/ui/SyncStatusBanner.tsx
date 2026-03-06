import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@infra/sync/network';
import { getLastSyncAt } from '@infra/db/repos/syncStateRepo';

// ─────────────────────────────────────────────
// Relative time formatting
// ─────────────────────────────────────────────

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000); // seconds
  if (diff < 5) return 'à l\'instant';
  if (diff < 60) return `il y a ${diff}s`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function SyncStatusBanner() {
  const { isOnline } = useNetworkStatus();
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [, setTick] = useState(0); // forces re-render to update relative time

  // Load last sync timestamp from DB
  useEffect(() => {
    getLastSyncAt().then(ts => setLastSyncAt(ts));
  }, [isOnline]); // re-check when connectivity changes

  // Refresh relative time every 15s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.label}>Hors ligne — modifications en attente de sync</Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, styles.online]}>
      <Text style={[styles.dot, styles.dotOnline]}>●</Text>
      <Text style={styles.label}>
        {lastSyncAt ? `Synchronisé ${formatRelative(lastSyncAt)}` : 'En ligne'}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  offline: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  online: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  dot: {
    fontSize: 10,
    color: '#d97706',
  },
  dotOnline: {
    color: '#16a34a',
  },
  label: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
  },
});

