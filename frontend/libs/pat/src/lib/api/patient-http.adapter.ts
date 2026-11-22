import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { PatientPort, PatientWire, RegisterPatientRequest, PatientStatus } from './patient.port';

// Base: ${ACCESS_HTTP_BASE}/pat (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// X-Tenant-Id is never set from the request; PAT derives tenant from JWT `tenantId` claim (INV-PAT-1).

@Injectable({ providedIn: 'root' })
export class PatientHttpAdapter implements PatientPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/pat`;

  list(status: PatientStatus | 'all' = 'active'): Observable<PatientWire[]> {
    return this.http
      .get<{ patients: PatientWire[] }>(`${this.base}/patients`, { params: { status } })
      .pipe(map(r => r.patients));
  }

  get(patientId: string): Observable<PatientWire> {
    return this.http.get<PatientWire>(`${this.base}/patients/${patientId}`);
  }

  register(req: RegisterPatientRequest): Observable<PatientWire> {
    return this.http.post<PatientWire>(`${this.base}/patients`, {
      label: req.label,
      deviceId: req.deviceId ?? null,
    });
  }
}
