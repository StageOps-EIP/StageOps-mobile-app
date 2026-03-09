import { getDatabase } from './db';
import { MIGRATION_V1, MIGRATION_V2, SCHEMA_VERSION } from './schema';
import { log } from '@infra/logging/log';

const TAG = 'Migrations';
const VERSION_KEY = 'schema_version';

// ─────────────────────────────────────────────
// Version helpers (stored in sync_state)
// ─────────────────────────────────────────────

async function getStoredVersion(): Promise<number> {
  const db = getDatabase();
  try {
    // sync_state might not exist yet on first run
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = ?`,
      [VERSION_KEY],
    );
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    // Table doesn't exist yet — version is 0
    return 0;
  }
}

async function setStoredVersion(version: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [VERSION_KEY, String(version), Date.now()],
  );
}

// ─────────────────────────────────────────────
// Individual version runners
// ─────────────────────────────────────────────

async function applyMigrationV1(): Promise<void> {
  const db = getDatabase();
  log.info(TAG, 'Applying migration V1 — initial schema');
  // execAsync supports multiple statements separated by semicolons
  await db.withExclusiveTransactionAsync(async txn => {
    for (const stmt of MIGRATION_V1) {
      await txn.execAsync(stmt);
    }
  });
  await setStoredVersion(1);
  log.info(TAG, 'Migration V1 applied');
}

async function applyMigrationV2(): Promise<void> {
  const db = getDatabase();
  log.info(TAG, 'Applying migration V2 — scene feature');
  await db.withExclusiveTransactionAsync(async txn => {
    for (const stmt of MIGRATION_V2) {
      await txn.execAsync(stmt);
    }
  });
  await setStoredVersion(2);
  log.info(TAG, 'Migration V2 applied');
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Run all pending migrations against the open database.
 *
 * - Idempotent: safe to call every time at startup.
 * - Reads current schema version from `sync_state.schema_version`.
 * - Applies each version in order up to `SCHEMA_VERSION`.
 *
 * @example
 * // In AppProviders.tsx:
 * await openDatabase();
 * await migrate();
 */
export async function migrate(): Promise<void> {
  log.info(TAG, 'Checking schema version');

  const current = await getStoredVersion();
  log.info(TAG, `Schema: current=${current}, target=${SCHEMA_VERSION}`);

  if (current >= SCHEMA_VERSION) {
    log.info(TAG, 'Schema is up to date');
    return;
  }

  // Apply each pending version in sequence
  if (current < 1) await applyMigrationV1();
  if (current < 2) await applyMigrationV2();

  log.info(TAG, `Migration complete. Schema is now V${SCHEMA_VERSION}`);
}

