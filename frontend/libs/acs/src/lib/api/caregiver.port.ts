import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror the BE api-contract §2 (ACS — Caregivers and Access).
// Keep in sync with acs-service (source of truth: api-contract.md §2).

export type CaregiverRole = 'caregiver' | 'clinic_coordinator';
export type CaregiverStatus = 'active' | 'deactivated';

/** Mirrors POST /acs/caregivers + DELETE /acs/caregivers/{id} + GET /acs/caregivers/me response. */
export interface CaregiverWire {
  id: string;
  tenantId: string;
  username: string;
  role: CaregiverRole;
  status: CaregiverStatus;
}

/** Mirrors GET /acs/caregivers/{caregiverId}/links response items. */
export interface PatientLinkWire {
  id: string;
  caregiverId: string;
  patientId: string;
}

/** Request body for POST /acs/caregivers (api-contract §2.1). */
export interface RegisterCaregiverRequest {
  /** Must not drop any field — carry-forward `http-adapter:request-body-field-whitelist`. */
  username: string;
  password: string;
  role: CaregiverRole;
}

export interface CaregiverPort {
  /** GET /acs/caregivers/me — returns the authenticated caregiver's profile. */
  me(): Observable<CaregiverWire>;
  /** POST /acs/caregivers — authority acs.caregiver.create (api-contract §2.1). */
  register(req: RegisterCaregiverRequest): Observable<CaregiverWire>;
  /** DELETE /acs/caregivers/{id} — soft-deactivate (api-contract §2.2). */
  deactivate(id: string): Observable<void>;
  /** GET /acs/caregivers/{caregiverId}/links — authenticated caregiver (api-contract §3.3). */
  listLinks(caregiverId: string): Observable<PatientLinkWire[]>;
  /** POST /acs/caregivers/{caregiverId}/links — authority acs.patient-link.link (§3.1). */
  link(caregiverId: string, patientId: string): Observable<PatientLinkWire>;
  /** DELETE /acs/caregivers/{caregiverId}/links/{patientId} — authority acs.patient-link.unlink (§3.2). */
  unlink(caregiverId: string, patientId: string): Observable<void>;
}

export const CAREGIVER_PORT = new InjectionToken<CaregiverPort>('CaregiverPort');
