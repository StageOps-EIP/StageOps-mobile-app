// ─────────────────────────────────────────────
// Equipment
// ─────────────────────────────────────────────
export type EquipmentCategory =
  | 'SON'
  | 'LUMIERE'
  | 'VIDEO'
  | 'PLATEAU'
  | 'SECURITE'
  | 'ACCROCHE';

export type EquipmentStatus = 'OK' | 'A_VERIFIER' | 'HS' | 'EN_REPARATION';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  qr_code: string;
  location: string;
  status: EquipmentStatus;
  responsible_name: string | null;
  last_check_at: number | null; // epoch ms
  notes: string | null;
  updated_at: number; // epoch ms
  deleted_at: number | null;
}

// ─────────────────────────────────────────────
// Incidents
// ─────────────────────────────────────────────
export type IncidentSeverity = 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Incident {
  id: string;
  equipment_id: string | null;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

// ─────────────────────────────────────────────
// Outbox
// ─────────────────────────────────────────────
export type OutboxEventType =
  | 'EQUIPMENT_UPDATE_STATUS'
  | 'EQUIPMENT_UPDATE'
  | 'INCIDENT_CREATE'
  | 'INCIDENT_UPDATE';

export type OutboxStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface OutboxEvent {
  event_id: string;
  device_id: string;
  type: OutboxEventType;
  payload_json: string;
  created_at: number;
  status: OutboxStatus;
  last_error: string | null;
  attempt_count: number;
}

// ─────────────────────────────────────────────
// Sync state
// ─────────────────────────────────────────────
export interface SyncState {
  key: string;
  value: string;
  updated_at: number;
}

// ─────────────────────────────────────────────
// Sync API contracts
// ─────────────────────────────────────────────
export interface SyncPushEvent {
  event_id: string;
  type: OutboxEventType;
  created_at: number;
  payload: Record<string, unknown>;
}

export interface SyncPushRequest {
  device_id: string;
  events: SyncPushEvent[];
}

export interface SyncPushAck {
  event_id: string;
  ok: boolean;
  error?: string;
}

export interface SyncPushResponse {
  acks: SyncPushAck[];
}

export type SyncChangeEntity = 'equipment' | 'incidents';
export type SyncChangeOp = 'upsert' | 'delete';

export interface SyncChange {
  entity: SyncChangeEntity;
  op: SyncChangeOp;
  data: Record<string, unknown>;
  updated_at: number;
}

export interface SyncPullResponse {
  next_cursor: string;
  changes: SyncChange[];
}

// ─────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────

export type SceneItemType = 'light' | 'camera' | 'speaker';

export type SceneItemState = 'ok' | 'a_verifier' | 'hors_service' | 'en_reparation';

export interface SceneItem {
  id: string;
  type: SceneItemType;
  label: string;
  /** Normalized horizontal position: 0.0 = left, 1.0 = right. Used in both views. */
  x: number;
  /** Normalized height: 0.0 = floor, 1.0 = fly tower top. Used in elevation view. */
  y: number;
  /** Normalized depth: 0.0 = front-of-stage, 1.0 = upstage. Used in top view. */
  z: number;
  state: SceneItemState;
  created_at: number;
  updated_at: number;
}

