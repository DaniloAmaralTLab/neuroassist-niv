import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { ConsentPort } from './consent.port';
import { ConsentRecord, ConsentWire, toConsent } from '../trn.model';

@Injectable({ providedIn: 'root' })
export class ConsentHttpAdapter implements ConsentPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/trn`;

  create(patientId: string, representativeConsent: boolean): Observable<ConsentRecord> {
    return this.http
      .post<ConsentWire>(`${this.base}/consents`, { patientId, representativeConsent })
      .pipe(map(toConsent));
  }

  get(patientId: string): Observable<ConsentRecord> {
    return this.http
      .get<ConsentWire>(`${this.base}/patients/${patientId}/consent`)
      .pipe(map(toConsent));
  }

  revoke(consentId: string): Observable<ConsentRecord> {
    return this.http
      .post<ConsentWire>(`${this.base}/consents/${consentId}/revocation`, {})
      .pipe(map(toConsent));
  }
}
