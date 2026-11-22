import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §2.1 (EVNT — POST /evnt/gesture-reports).
// Keep in sync with evnt-service (source of truth: evnt api-contract.md §2.1).
// NOTE: deviceId / patientId / tenantId are NEVER in the body — EVNT extracts them
// from the edge.device token claims (INV-EVNT-6). Do not add them here.

/**
 * Request body for POST /evnt/gesture-reports (EVNT §2.1).
 * Carry-forward: http-adapter:request-body-field-whitelist — no extra fields.
 */
export interface GestureReportWire {
  /** Station-unique idempotent id minted once at recognition; reused across retries (INV-GEST-1). */
  commandId: string;
  reportId: string;
  /** ISO timestamp stamped AT recognition — never re-stamped on retry (INV-GEST-5). */
  occurredAt: string;
  /** Optional tuning signal — stored verbatim by EVNT, not used to branch v1 logic. */
  confidence?: number;
  recognitionWindowMs?: number;
}

/** Mirror of the 201/200 response (EVNT §2.1) — the generated Event. */
export interface EventWire {
  id: string;
  patientId: string;
  commandId: string;
  commandLabel: string;
  urgency: 'emergency' | 'routine';
  deviceId: string;
  reportId: string;
  occurredAt: string;
  confirmedAt: string | null;
  feedback: string;
  createdAt: string;
}

export interface GestureReportPort {
  /**
   * POST /evnt/gesture-reports — authenticated by edge.device token.
   * Exactly-once: EVNT idempotent on (deviceId, reportId) — 201 new, 200 replay.
   * Pessimistic: the item stays 'sending' until this resolves (no optimistic update).
   */
  report(payload: GestureReportWire): Observable<EventWire>;
}

export const GESTURE_REPORT_PORT = new InjectionToken<GestureReportPort>('GestureReportPort');
