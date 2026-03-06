import { getAll, transaction } from './db';
import { log } from '@infra/logging/log';
import type { Equipment, Incident } from '@shared/types';

const TAG = 'Seed';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** epoch ms offset from now */
const ago = (ms: number) => Date.now() - ms;
const h = (n: number) => n * 60 * 60 * 1000;
const d = (n: number) => n * 24 * h(1);

// ─────────────────────────────────────────────
// Demo data
// ─────────────────────────────────────────────

const EQUIPMENT: Equipment[] = [
  {
    id: 'equip-001',
    name: 'Console Son DiGiCo SD12',
    category: 'SON',
    qr_code: 'QR-SOUND-001',
    location: 'Régie Son',
    status: 'OK',
    responsible_name: 'Martin Dupont',
    last_check_at: ago(d(2)),
    notes: null,
    updated_at: ago(d(2)),
    deleted_at: null,
  },
  {
    id: 'equip-002',
    name: 'Enceinte L-Acoustics K2 L',
    category: 'SON',
    qr_code: 'QR-SOUND-002',
    location: 'Fond de scène',
    status: 'OK',
    responsible_name: 'Martin Dupont',
    last_check_at: ago(d(1)),
    notes: 'Vérifier câblage XLR',
    updated_at: ago(d(1)),
    deleted_at: null,
  },
  {
    id: 'equip-003',
    name: 'Console Lumière GrandMA3',
    category: 'LUMIERE',
    qr_code: 'QR-LIGHT-001',
    location: 'Régie Lumière',
    status: 'A_VERIFIER',
    responsible_name: 'Sophie Lemaire',
    last_check_at: ago(d(5)),
    notes: 'Patch DMX à reconfigurer',
    updated_at: ago(d(5)),
    deleted_at: null,
  },
  {
    id: 'equip-004',
    name: 'Lyre Robe BMFL Spot',
    category: 'LUMIERE',
    qr_code: 'QR-LIGHT-002',
    location: 'Gril',
    status: 'HS',
    responsible_name: 'Sophie Lemaire',
    last_check_at: ago(d(3)),
    notes: 'Moteur pan bloqué — en attente pièce',
    updated_at: ago(h(6)),
    deleted_at: null,
  },
  {
    id: 'equip-005',
    name: 'Projecteur Vidéo Panasonic PT-RQ35K',
    category: 'VIDEO',
    qr_code: 'QR-VIDEO-001',
    location: 'Fond de scène',
    status: 'OK',
    responsible_name: 'Léa Bernard',
    last_check_at: ago(d(1)),
    notes: null,
    updated_at: ago(d(1)),
    deleted_at: null,
  },
  {
    id: 'equip-006',
    name: 'Praticable 2m×1m H60',
    category: 'PLATEAU',
    qr_code: 'QR-PLAT-001',
    location: 'Zone scène principale',
    status: 'EN_REPARATION',
    responsible_name: null,
    last_check_at: ago(d(7)),
    notes: 'Verrou de sécurité cassé — ne pas utiliser',
    updated_at: ago(h(12)),
    deleted_at: null,
  },
  {
    id: 'equip-007',
    name: 'Harnais sécurité SALA DeltaPlus',
    category: 'SECURITE',
    qr_code: 'QR-SECU-001',
    location: 'Local technique',
    status: 'OK',
    responsible_name: 'Paul Moreau',
    last_check_at: ago(d(14)),
    notes: 'Prochain contrôle dans 6 mois',
    updated_at: ago(d(14)),
    deleted_at: null,
  },
  {
    id: 'equip-008',
    name: 'Moteur chaîne Verlinde D8+ 500kg',
    category: 'ACCROCHE',
    qr_code: 'QR-ACCROCHE-001',
    location: 'Gril',
    status: 'A_VERIFIER',
    responsible_name: 'Paul Moreau',
    last_check_at: ago(d(30)),
    notes: 'Révision annuelle dépassée',
    updated_at: ago(d(30)),
    deleted_at: null,
  },
];

const INCIDENTS: Incident[] = [
  {
    id: 'inc-001',
    equipment_id: 'equip-004',
    title: 'Lyre BMFL — moteur pan bloqué',
    severity: 'ELEVEE',
    status: 'IN_PROGRESS',
    description:
      'La lyre Robe BMFL Spot (gril, position 3) ne répond plus sur le pan. ' +
      'Le moteur semble mécaniquement bloqué. Maintien en sécurité, hors patch.',
    created_by: 'Sophie Lemaire',
    created_at: ago(h(6)),
    updated_at: ago(h(5)),
    deleted_at: null,
  },
  {
    id: 'inc-002',
    equipment_id: 'equip-006',
    title: 'Praticable — verrou de sécurité cassé',
    severity: 'ELEVEE',
    status: 'OPEN',
    description:
      'Le verrou de liaison du praticable 2m×1m H60 est cassé. ' +
      'Risque de désolidarisation en charge. Zone condamnée.',
    created_by: 'Paul Moreau',
    created_at: ago(h(12)),
    updated_at: ago(h(12)),
    deleted_at: null,
  },
  {
    id: 'inc-003',
    equipment_id: 'equip-003',
    title: 'Console GrandMA3 — patch DMX perdu',
    severity: 'MOYENNE',
    status: 'OPEN',
    description:
      'Après coupure secteur, le patch DMX de la console a été réinitialisé. ' +
      'Récupération du fichier de show en cours.',
    created_by: 'Sophie Lemaire',
    created_at: ago(d(5)),
    updated_at: ago(d(5)),
    deleted_at: null,
  },
];

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Inserts demo data only if the equipment table is empty.
 * Safe to call at every startup (idempotent).
 */
export async function seedIfEmpty(): Promise<void> {
  const rows = await getAll<{ id: string }>('SELECT id FROM equipment LIMIT 1');
  if (rows.length > 0) {
    log.debug(TAG, 'DB already seeded — skipping');
    return;
  }

  log.info(TAG, 'Seeding demo data');

  await transaction(async txn => {
    for (const eq of EQUIPMENT) {
      await txn.runAsync(
        `INSERT INTO equipment
           (id, name, category, qr_code, location, status,
            responsible_name, last_check_at, notes, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eq.id, eq.name, eq.category, eq.qr_code, eq.location, eq.status,
          eq.responsible_name, eq.last_check_at, eq.notes, eq.updated_at, eq.deleted_at,
        ],
      );
    }

    for (const inc of INCIDENTS) {
      await txn.runAsync(
        `INSERT INTO incidents
           (id, equipment_id, title, severity, status,
            description, created_by, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inc.id, inc.equipment_id, inc.title, inc.severity, inc.status,
          inc.description, inc.created_by, inc.created_at, inc.updated_at, inc.deleted_at,
        ],
      );
    }
  });

  log.info(TAG, `Seeded ${EQUIPMENT.length} equipment + ${INCIDENTS.length} incidents`);
}

/**
 * DEV ONLY — wipes all rows from every table.
 * Does NOT drop tables or reset schema_version.
 */
export async function resetDb(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.warn(TAG, 'resetDb() called in production — ignored');
    return;
  }
  log.warn(TAG, 'Resetting all data');
  await transaction(async txn => {
    await txn.execAsync(
      'DELETE FROM outbox_events; DELETE FROM incidents; DELETE FROM equipment;',
    );
  });
  log.warn(TAG, 'All data cleared');
}
