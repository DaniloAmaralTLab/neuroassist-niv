import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ConsentPort } from './consent.port';
import { ConsentRecord } from '../trn.model';

let mockConsent: ConsentRecord | null = null;

@Injectable()
export class ConsentMockAdapter implements ConsentPort {
  create(patientId: string, _representativeConsent: boolean): Observable<ConsentRecord> {
    const now = new Date().toISOString();
    mockConsent = {
      id: `consent-mock-${Date.now()}`,
      patientId,
      status: 'granted',
      grantedAt: now,
      revokedAt: null,
    };
    return of({ ...mockConsent }).pipe(delay(400));
  }

  get(patientId: string): Observable<ConsentRecord> {
    const record = mockConsent ?? {
      id: '',
      patientId,
      status: 'not_captured' as const,
      grantedAt: null,
      revokedAt: null,
    };
    return of({ ...record }).pipe(delay(400));
  }

  revoke(consentId: string): Observable<ConsentRecord> {
    if (!mockConsent || mockConsent.id !== consentId) {
      throw new Error(`Mock: consent ${consentId} not found`);
    }
    const now = new Date().toISOString();
    mockConsent = { ...mockConsent, status: 'revoked', revokedAt: now };
    return of({ ...mockConsent }).pipe(delay(400));
  }
}
