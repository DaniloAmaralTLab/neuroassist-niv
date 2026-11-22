import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror BE api-contract §4 (Patient sessions — ACS).
// Keep in sync with acs-service (source of truth: api-contract.md §4).

export type PatientSessionStatus = 'active' | 'revoked';

/** Mirrors GET /acs/patient-sessions/{id} and POST /acs/patient-sessions response. */
export interface PatientSessionWire {
  id: string;
  patientId: string;
  deviceId: string;
  status: PatientSessionStatus;
  provisionedBy: string;
  revokedBy: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Request body for POST /acs/patient-sessions (api-contract §4.1). */
export interface ProvisionSessionRequest {
  /** Must not drop any field — carry-forward `http-adapter:request-body-field-whitelist`. */
  patientId: string;
  deviceId: string;
}

export interface PatientSessionPort {
  /** GET /acs/patient-sessions/{id} — authenticated caregiver (api-contract §4.3). */
  get(id: string): Observable<PatientSessionWire>;
  /** POST /acs/patient-sessions — authority acs.patient-session.provision (api-contract §4.1). */
  provision(req: ProvisionSessionRequest): Observable<PatientSessionWire>;
  /** DELETE /acs/patient-sessions/{id} — authority acs.patient-session.revoke (api-contract §4.2).
   *  Idempotent on the BE (204 even if already revoked). Default: pessimistic (SEC-001). */
  revoke(id: string): Observable<void>;
}

export const PATIENT_SESSION_PORT = new InjectionToken<PatientSessionPort>('PatientSessionPort');
