import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ErasureAck } from '../trn.model';

// ---------------------------------------------------------------------------
// ContentPort — covers BE api-contract §7 (right-to-be-forgotten erasure).
// Erasure is irreversible. The BE erases the voice model, crypto-shreds all
// biometric material, retires published nodes from CONV, and records to HIST.
// Erasure must never be blocked by HIST/CONV outage (ADR-007 TRN INV-9).
// ---------------------------------------------------------------------------

export interface ContentPort {
  /**
   * DELETE /trn/patients/{patientId}/content.
   * Returns 202 Accepted with counts of erased and retired items.
   * Authority: trn.content.delete (BE §7.1).
   */
  erase(patientId: string): Observable<ErasureAck>;
}

export const CONTENT_PORT = new InjectionToken<ContentPort>('ContentPort');
