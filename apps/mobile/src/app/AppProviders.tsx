import { type ReactNode, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { openDatabase } from '@infra/db/db';
import { migrate } from '@infra/db/migrations';
import { seedIfEmpty } from '@infra/db/seed';
import { log } from '@infra/logging/log';

const TAG = 'AppProviders';

interface Props {
  children: ReactNode;
}

/**
 * Wraps the entire app tree.
 * Initialises the SQLite database and runs migrations before rendering children.
 * Shows a loading indicator until the DB is ready.
 */
export function AppProviders({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await openDatabase();
        await migrate();
        await seedIfEmpty();
        if (!cancelled) setReady(true);
      } catch (err) {
        log.error(TAG, 'DB init failed', err);
        // In a real app: surface an error screen here
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});

