import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import { EventWire, GestureReportPort, GestureReportWire } from './gesture-report.port';

/**
 * HTTP adapter for GestureReportPort.
 * Calls POST /evnt/gesture-reports authenticated by the edge.device token
 * via the device-token interceptor variant of @neuroassist/shared/access-http-base.
 *
 * The request body carries ONLY {commandId, reportId, occurredAt, confidence?,
 * recognitionWindowMs?} — deviceId / patientId / tenantId come from the token
 * claims (EVNT INV-EVNT-6; carry-forward http-adapter:request-body-field-whitelist).
 *
 * Exactly-once: EVNT idempotent on (deviceId, reportId) — 201 new, 200 replay.
 */
@Injectable()
export class GestureReportHttpAdapter implements GestureReportPort {
  private readonly http = inject(HttpClient);
  // Base: ${ACCESS_HTTP_BASE}/evnt (not /api/v1 — carry-forward `http-adapter:wrong-prefix`).
  private readonly base = `${ACCESS_HTTP_BASE}/evnt`;

  report(payload: GestureReportWire): Observable<EventWire> {
    // Whitelist: only the fields the EVNT contract accepts.
    // deviceId/patientId/tenantId are extracted by EVNT from the edge.device bearer.
    const body: GestureReportWire = {
      commandId: payload.commandId,
      reportId: payload.reportId,
      occurredAt: payload.occurredAt,
      ...(payload.confidence !== undefined ? { confidence: payload.confidence } : {}),
      ...(payload.recognitionWindowMs !== undefined
        ? { recognitionWindowMs: payload.recognitionWindowMs }
        : {}),
    };
    return this.http.post<EventWire>(`${this.base}/gesture-reports`, body);
  }
}
