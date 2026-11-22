import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { ContentPort } from './content.port';
import { ErasureAck, ErasureAckWire, toErasureAck } from '../trn.model';

// DELETE /trn/patients/{patientId}/content returns 202 Accepted.
// Erasure is irreversible; trn-service handles HIST + CONV retires server-side.

@Injectable({ providedIn: 'root' })
export class ContentHttpAdapter implements ContentPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/trn`;

  erase(patientId: string): Observable<ErasureAck> {
    return this.http
      .delete<ErasureAckWire>(`${this.base}/patients/${patientId}/content`)
      .pipe(map(toErasureAck));
  }
}
