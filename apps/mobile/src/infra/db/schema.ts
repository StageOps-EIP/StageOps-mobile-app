/**
 * SQLite schema — CREATE TABLE IF NOT EXISTS statements.
 *
 * Rules:
 * - Every statement is idempotent (IF NOT EXISTS).
 * - Timestamps are stored as INTEGER epoch ms.
 * - Soft-delete via deleted_at (sync tables). Scene uses hard delete (local-only).
 */

export const SCHEMA_VERSION = 2;

// ─────────────────────────────────────────────
// Table definitions
// ─────────────────────────────────────────────

export const CREATE_EQUIPMENT = `
  CREATE TABLE IF NOT EXISTS equipment (
    id               TEXT    NOT NULL PRIMARY KEY,
    name             TEXT    NOT NULL,
    category         TEXT    NOT NULL,
    qr_code          TEXT    NOT NULL UNIQUE,
    location         TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'OK',
    responsible_name TEXT,
    last_check_at    INTEGER,
    notes            TEXT,
    updated_at       INTEGER NOT NULL,
    deleted_at       INTEGER
  );
`;

export const CREATE_INCIDENTS = `
  CREATE TABLE IF NOT EXISTS incidents (
    id           TEXT    NOT NULL PRIMARY KEY,
    equipment_id TEXT,
    title        TEXT    NOT NULL,
    severity     TEXT    NOT NULL DEFAULT 'FAIBLE',
    status       TEXT    NOT NULL DEFAULT 'OPEN',
    description  TEXT,
    created_by   TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    deleted_at   INTEGER
  );
`;

export const CREATE_OUTBOX_EVENTS = `
  CREATE TABLE IF NOT EXISTS outbox_events (
    event_id      TEXT    NOT NULL PRIMARY KEY,
    device_id     TEXT    NOT NULL,
    type          TEXT    NOT NULL,
    payload_json  TEXT    NOT NULL,
    created_at    INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'PENDING',
    last_error    TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0
  );
`;

export const CREATE_SYNC_STATE = `
  CREATE TABLE IF NOT EXISTS sync_state (
    key        TEXT    NOT NULL PRIMARY KEY,
    value      TEXT    NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const CREATE_SCENE_EQUIPMENT = `
  CREATE TABLE IF NOT EXISTS scene_equipment (
    id         TEXT    NOT NULL PRIMARY KEY,
    type       TEXT    NOT NULL,
    label      TEXT    NOT NULL,
    pos_x      REAL    NOT NULL DEFAULT 0.5,
    pos_y      REAL    NOT NULL DEFAULT 0.5,
    state      TEXT    NOT NULL DEFAULT 'ok',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

// ─────────────────────────────────────────────
// Indexes (idempotent)
// ─────────────────────────────────────────────

export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_equipment_status    ON equipment (status);
  CREATE INDEX IF NOT EXISTS idx_equipment_category  ON equipment (category);
  CREATE INDEX IF NOT EXISTS idx_equipment_updated   ON equipment (updated_at);
  CREATE INDEX IF NOT EXISTS idx_incidents_status    ON incidents (status);
  CREATE INDEX IF NOT EXISTS idx_incidents_equipment ON incidents (equipment_id);
  CREATE INDEX IF NOT EXISTS idx_outbox_status       ON outbox_events (status, created_at);
`;

// ─────────────────────────────────────────────
// V0 migration bundle
// ─────────────────────────────────────────────

/** All DDL statements for schema V1, in execution order. */
export const MIGRATION_V1: string[] = [
  CREATE_EQUIPMENT,
  CREATE_INCIDENTS,
  CREATE_OUTBOX_EVENTS,
  CREATE_SYNC_STATE,
  CREATE_INDEXES,
];

/** All DDL statements for schema V2 (scene feature), in execution order. */
export const MIGRATION_V2: string[] = [CREATE_SCENE_EQUIPMENT];

