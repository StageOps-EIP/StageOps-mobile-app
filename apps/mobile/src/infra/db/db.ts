import * as SQLite from 'expo-sqlite';
import type { SQLiteBindParams, SQLiteRunResult } from 'expo-sqlite';
import { log } from '@infra/logging/log';

const TAG = 'DB';
const DB_NAME = 'stageops.db';

// ─────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────
let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or returns the existing) SQLite database singleton.
 * Must be called once at app startup, before any query.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  log.info(TAG, `Opening database: ${DB_NAME}`);
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  // Enable WAL mode for better concurrent read performance
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  log.info(TAG, 'Database ready');
  return _db;
}

/**
 * Returns the open database instance.
 * Throws if `openDatabase()` has not been called yet.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    throw new Error('[DB] Database not initialized. Call openDatabase() first.');
  }
  return _db;
}

// ─────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────

/**
 * Execute a write query (INSERT / UPDATE / DELETE / CREATE).
 * Returns the native run result (lastInsertRowId, changes).
 */
export async function run(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<SQLiteRunResult> {
  const db = getDatabase();
  try {
    log.debug(TAG, 'run', { sql, params });
    return await db.runAsync(sql, params);
  } catch (err) {
    log.error(TAG, 'run failed', { sql, err });
    throw err;
  }
}

/**
 * Execute a SELECT query and return all matching rows.
 */
export async function getAll<T = Record<string, unknown>>(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<T[]> {
  const db = getDatabase();
  try {
    log.debug(TAG, 'getAll', { sql, params });
    return await db.getAllAsync<T>(sql, params);
  } catch (err) {
    log.error(TAG, 'getAll failed', { sql, err });
    throw err;
  }
}

/**
 * Execute a SELECT query and return the first row, or null if none found.
 */
export async function getFirst<T = Record<string, unknown>>(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<T | null> {
  const db = getDatabase();
  try {
    log.debug(TAG, 'getFirst', { sql, params });
    return await db.getFirstAsync<T>(sql, params);
  } catch (err) {
    log.error(TAG, 'getFirst failed', { sql, err });
    throw err;
  }
}

// ─────────────────────────────────────────────
// Transaction helper
// ─────────────────────────────────────────────

/**
 * Runs `fn` inside an exclusive transaction.
 * Automatically commits on success, rolls back on error.
 *
 * The `txn` parameter is a scoped DB handle — use it for all queries
 * inside the transaction to guarantee atomicity.
 *
 * @example
 * await transaction(async (txn) => {
 *   await txn.runAsync('INSERT INTO ...', [...]);
 *   await txn.runAsync('UPDATE ...', [...]);
 * });
 */
export async function transaction(
  fn: (txn: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<void> {
  const db = getDatabase();
  log.debug(TAG, 'transaction:start');
  try {
    await db.withExclusiveTransactionAsync(fn);
    log.debug(TAG, 'transaction:commit');
  } catch (err) {
    log.error(TAG, 'transaction:rollback', { err });
    throw err;
  }
}

