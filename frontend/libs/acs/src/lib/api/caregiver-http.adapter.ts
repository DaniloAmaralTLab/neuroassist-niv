import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  CaregiverPort,
  CaregiverWire,
  PatientLinkWire,
  RegisterCaregiverRequest,
} from './caregiver.port';

// Base: ${ACCESS_HTTP_BASE}/acs (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// X-Tenant-Id is added by the access-http-base interceptor (derived from JWT, never from request body).

@Injectable({ providedIn: 'root' })
export class CaregiverHttpAdapter implements CaregiverPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/acs`;

  me(): Observable<CaregiverWire> {
    return this.http.get<CaregiverWire>(`${this.base}/caregivers/me`);
  }

  register(req: RegisterCaregiverRequest): Observable<CaregiverWire> {
    return this.http.post<CaregiverWire>(`${this.base}/caregivers`, {
      username: req.username,
      password: req.password,
      role: req.role,
    });
  }

  deactivate(id: string): Observable<void> {
    return this.http
      .delete(`${this.base}/caregivers/${id}`)
      .pipe(map(() => undefined));
  }

  listLinks(caregiverId: string): Observable<PatientLinkWire[]> {
    return this.http
      .get<{ links: PatientLinkWire[] }>(`${this.base}/caregivers/${caregiverId}/links`)
      .pipe(map(r => r.links));
  }

  link(caregiverId: string, patientId: string): Observable<PatientLinkWire> {
    return this.http.post<PatientLinkWire>(
      `${this.base}/caregivers/${caregiverId}/links`,
      { patientId },
    );
  }

  unlink(caregiverId: string, patientId: string): Observable<void> {
    return this.http
      .delete(`${this.base}/caregivers/${caregiverId}/links/${patientId}`)
      .pipe(map(() => undefined));
  }
}
