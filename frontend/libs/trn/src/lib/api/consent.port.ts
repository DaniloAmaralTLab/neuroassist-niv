import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ConsentRecord } from '../trn.model';

// ---------------------------------------------------------------------------
// ConsentPort — covers BE api-contract §5 (voice-cloning consent).
// ---------------------------------------------------------------------------

export interface ConsentPort {
  /**
   * POST /trn/consents — Captures patient + representative voice-cloning consent.
   * Authority: trn.consent.create (BE §5.1).
   * Consent is required before any synthesis (ADR-005 TTS consent).
   */
  create(patientId: string, representativeConsent: boolean): Observable<ConsentRecord>;

  /**
   * GET /trn/patients/{patientId}/consent — Reads the patient's consent gate state.
   * Authority: trn.consent.read (BE §5.2).
   */
  get(patientId: string): Observable<ConsentRecord>;

  /**
   * POST /trn/consents/{consentId}/revocation — Revokes voice-cloning consent.
   * Authority: trn.consent.revoke (BE §5.3).
   * Triggers erasure pipeline server-side (crypto-shred + CONV retire/erase, ADR-005).
   */
  revoke(consentId: string): Observable<ConsentRecord>;
}

export const CONSENT_PORT = new InjectionToken<ConsentPort>('ConsentPort');
