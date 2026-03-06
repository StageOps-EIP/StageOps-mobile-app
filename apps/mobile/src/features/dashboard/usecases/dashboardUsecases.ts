import { getAllEquipment } from '@infra/db/repos/equipmentRepo';
import { getAllIncidents, listRecentIncidents } from '@infra/db/repos/incidentRepo';
import type { Incident } from '@shared/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DashboardStats {
  hs: number;
  aVerifier: number;
  operationnels: number;
  openIncidents: number;
}

// ─────────────────────────────────────────────
// Use-cases
// ─────────────────────────────────────────────

/**
 * Computes the 4 summary counts shown on the dashboard.
 * All reads hit the local SQLite DB — no network required.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [equipment, incidents] = await Promise.all([
    getAllEquipment(),
    getAllIncidents(),
  ]);

  return {
    hs: equipment.filter((e) => e.status === 'HS').length,
    aVerifier: equipment.filter((e) => e.status === 'A_VERIFIER').length,
    operationnels: equipment.filter((e) => e.status === 'OK').length,
    openIncidents: incidents.filter(
      (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS',
    ).length,
  };
}

/**
 * Returns the `limit` most recently created incidents (last 24 h).
 */
export async function getRecentIncidents(limit = 3): Promise<Incident[]> {
  return listRecentIncidents(limit);
}

