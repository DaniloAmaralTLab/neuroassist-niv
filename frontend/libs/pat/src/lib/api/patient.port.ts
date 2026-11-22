import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §1 (PAT — Patients and Command Catalog).
// Keep in sync with pat-service (source of truth: api-contract.md §1).
// Base path: /pat (via ACCESS_HTTP_BASE/pat — see patient-http.adapter.ts).

export type PatientStatus = 'active' | 'inactive';

/** Mirrors GET /pat/patients + POST /pat/patients + GET /pat/patients/{id} response. */
export interface PatientWire {
  id: string;
  tenantId: string;
  label: string;
  deviceId: string | null;
  status: PatientStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Request body for POST /pat/patients (api-contract §1.1). */
export interface RegisterPatientRequest {
  label: string;
  deviceId?: string | null;
}

export interface PatientPort {
  /** GET /pat/patients — authority pat.patient.read (api-contract §1.2). */
  list(status?: PatientStatus | 'all'): Observable<PatientWire[]>;
  /** GET /pat/patients/{patientId} — authority pat.patient.read (api-contract §1.3). */
  get(patientId: string): Observable<PatientWire>;
  /** POST /pat/patients — authority pat.patient.create (api-contract §1.1). */
  register(req: RegisterPatientRequest): Observable<PatientWire>;
}

export const PATIENT_PORT = new InjectionToken<PatientPort>('PatientPort');
