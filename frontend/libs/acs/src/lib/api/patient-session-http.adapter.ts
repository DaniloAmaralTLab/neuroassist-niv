import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  PatientSessionPort,
  PatientSessionWire,
  ProvisionSessionRequest,
} from './patient-session.port';

// Base: ${ACCESS_HTTP_BASE}/acs (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// X-Tenant-Id is added by the access-http-base interceptor (derived from JWT, never from request body).

@Injectable({ providedIn: 'root' })
export class PatientSessionHttpAdapter implements PatientSessionPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/acs`;

  get(id: string): Observable<PatientSessionWire> {
    return this.http.get<PatientSessionWire>(`${this.base}/patient-sessions/${id}`);
  }

  provision(req: ProvisionSessionRequest): Observable<PatientSessionWire> {
    return this.http.post<PatientSessionWire>(`${this.base}/patient-sessions`, {
      patientId: req.patientId,
      deviceId: req.deviceId,
    });
  }

  /** Pessimistic revoke: await server 204 before marking row (SEC-001). */
  revoke(id: string): Observable<void> {
    return this.http
      .delete(`${this.base}/patient-sessions/${id}`)
      .pipe(map(() => undefined));
  }
}
