import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §2 (EDGE — Edge Device Integration).
// Keep in sync with edge-service (source of truth: api-contract.md §2).
// NOTE: no `version` field in the BE contract (G-EDGE-2) — do not add it here.

export type EdgeLifecycleState = 'awaiting_claim' | 'paired' | 'deactivated' | 'revoked';
export type EdgeConnectivity = 'online' | 'offline';

/** Mirror of GET /edge/devices/{id} (api-contract §2.3). */
export interface EdgeDeviceWire {
  id: string;
  tenantId: string;
  patientId: string;
  lifecycleState: EdgeLifecycleState;
  /** null WHILE lifecycleState != 'paired' (§2.3). */
  connectivity: EdgeConnectivity | null;
  /** ISO timestamp; null before the first heartbeat. */
  lastHeartbeatAt: string | null;
  pairedAt: string | null;
  enrolledBy: string;
  credentialId: string | null;
  catalogFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // version is intentionally absent — G-EDGE-2: no BE field exists.
}

/** Mirror of GET /edge/devices (§2.2) — reduced row. */
export interface EdgeDeviceRowWire {
  id: string;
  patientId: string;
  lifecycleState: EdgeLifecycleState;
  connectivity: EdgeConnectivity | null;
  lastHeartbeatAt: string | null;
  pairedAt: string | null;
}

/**
 * Mirror of POST /edge/devices response (§2.1).
 * The one-time pairing code is returned exactly once — never re-read (INV-EDGE-3).
 */
export interface EnrollResultWire {
  id: string;
  tenantId: string;
  patientId: string;
  lifecycleState: 'awaiting_claim';
  connectivity: null;
  pairingCode: string;
  pairingCodeExpiresAt: string;
  enrolledBy: string;
  createdAt: string;
}

export interface EdgeDevicePort {
  /**
   * POST /edge/devices — enroll. Body: { patientId } only.
   * Returns the enroll result with the one-time pairing code.
   * Dashboard displays the code and polls GET /{id} until lifecycleState = 'paired'.
   * The dashboard NEVER calls POST /edge/devices/pair (station claim, authenticated by pairing code).
   */
  enroll(patientId: string): Observable<EnrollResultWire>;

  /** GET /edge/devices — list (dashboard read). */
  list(): Observable<EdgeDeviceRowWire[]>;

  /** GET /edge/devices/{id} — get one device. Drives the pairing poll + badge/card. */
  get(id: string): Observable<EdgeDeviceWire>;

  /** POST /edge/devices/{id}/activation — reactivate a deactivated device (idempotent on 'paired'). */
  reactivate(id: string): Observable<EdgeDeviceWire>;

  /** DELETE /edge/devices/{id} — deactivate (soft-disable, reversible). No request body. */
  deactivate(id: string): Observable<void>;

  /** DELETE /edge/devices/{id}/pairing — unpair (drop binding and cached catalog). No request body. */
  unpair(id: string): Observable<void>;

  /** DELETE /edge/devices/{id}/credential — terminal credential kill (revoke, idempotent). No request body. */
  revoke(id: string): Observable<void>;
}

export const EDGE_DEVICE_PORT = new InjectionToken<EdgeDevicePort>('EdgeDevicePort');
