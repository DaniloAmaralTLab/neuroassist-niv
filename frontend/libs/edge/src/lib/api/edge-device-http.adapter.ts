import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  EdgeDevicePort,
  EdgeDeviceWire,
  EdgeDeviceRowWire,
  EnrollResultWire,
} from './edge-device.port';

// Base: ${ACCESS_HTTP_BASE}/edge (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// X-Tenant-Id is added by the access-http-base interceptor (derived from JWT, never from request body).
// SPEC-04 §2: adapter default is 'http' — edge-service api-contract is published.
// The dashboard NEVER calls POST /edge/devices/pair (station-only, authenticated by pairing code).

@Injectable({ providedIn: 'root' })
export class EdgeDeviceHttpAdapter implements EdgeDevicePort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/edge`;

  enroll(patientId: string): Observable<EnrollResultWire> {
    // Body: { patientId } only — SPEC-04 §3 field whitelist.
    return this.http.post<EnrollResultWire>(`${this.base}/devices`, { patientId });
  }

  list(): Observable<EdgeDeviceRowWire[]> {
    return this.http.get<EdgeDeviceRowWire[]>(`${this.base}/devices`);
  }

  get(id: string): Observable<EdgeDeviceWire> {
    return this.http.get<EdgeDeviceWire>(`${this.base}/devices/${id}`);
  }

  reactivate(id: string): Observable<EdgeDeviceWire> {
    // POST /edge/devices/{id}/activation — no request body (api-contract §2.4).
    return this.http.post<EdgeDeviceWire>(`${this.base}/devices/${id}/activation`, {});
  }

  deactivate(id: string): Observable<void> {
    // DELETE /edge/devices/{id} — no request body (api-contract §2.6).
    return this.http
      .delete(`${this.base}/devices/${id}`)
      .pipe(map(() => undefined));
  }

  unpair(id: string): Observable<void> {
    // DELETE /edge/devices/{id}/pairing — no request body (api-contract §2.7).
    return this.http
      .delete(`${this.base}/devices/${id}/pairing`)
      .pipe(map(() => undefined));
  }

  revoke(id: string): Observable<void> {
    // DELETE /edge/devices/{id}/credential — no request body (api-contract §2.8).
    return this.http
      .delete(`${this.base}/devices/${id}/credential`)
      .pipe(map(() => undefined));
  }
}
