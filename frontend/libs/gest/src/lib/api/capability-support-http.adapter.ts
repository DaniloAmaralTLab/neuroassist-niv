import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  CapabilitySupportPort,
  GestEngineWire,
  SupportCheckRequestWire,
  SupportCheckResultWire,
} from './capability-support.port';

/**
 * HTTP adapter for CapabilitySupportPort.
 * Calls GEST endpoints authenticated by the edge.device token:
 *   - POST /gest/capabilities/support-check  (ETag cached by engineVersion)
 *   - GET  /gest/engines
 *
 * Both operations require the edge.device token to carry gest.capability.read
 * and gest.engine.read (INT-GEST-ACS-1 — OPEN: ACS must provision these on the token).
 */
@Injectable()
export class CapabilitySupportHttpAdapter implements CapabilitySupportPort {
  private readonly http = inject(HttpClient);
  // Base: ${ACCESS_HTTP_BASE}/gest (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
  private readonly base = `${ACCESS_HTTP_BASE}/gest`;

  checkSupport(req: SupportCheckRequestWire): Observable<SupportCheckResultWire> {
    return this.http.post<SupportCheckResultWire>(
      `${this.base}/capabilities/support-check`,
      req,
    );
  }

  listEngines(): Observable<GestEngineWire[]> {
    return this.http.get<GestEngineWire[]>(`${this.base}/engines`);
  }
}
