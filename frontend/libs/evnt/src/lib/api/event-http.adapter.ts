import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  EventPort,
  ActiveAlarmEnvelopeWire,
  PatientEventsPageWire,
  EventDetailWire,
  ConfirmationResultWire,
  FeedbackRequestWire,
  FeedbackResultWire,
  EscalationTrailWire,
} from './event.port';

// Base: ${ACCESS_HTTP_BASE}/evnt  (NOT /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// Paths follow the FE API CONTRACT, not the generated BE controllers (known per-op mismatches — M5 notes).
// X-Tenant-Id is added by the access-http-base interceptor; never sent by the FE (INV-EVNT-1).

@Injectable({ providedIn: 'root' })
export class EventHttpAdapter implements EventPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/evnt`;

  getActiveAlarm(patientId: string): Observable<ActiveAlarmEnvelopeWire> {
    return this.http.get<ActiveAlarmEnvelopeWire>(
      `${this.base}/patients/${patientId}/active-alarm`,
    );
  }

  listPatientEvents(patientId: string, limit = 20): Observable<PatientEventsPageWire> {
    return this.http.get<PatientEventsPageWire>(
      `${this.base}/patients/${patientId}/events`,
      { params: { urgency: 'routine', limit: String(limit) } },
    );
  }

  getEvent(eventId: string): Observable<EventDetailWire> {
    return this.http.get<EventDetailWire>(`${this.base}/events/${eventId}`);
  }

  confirmAlarm(eventId: string): Observable<ConfirmationResultWire> {
    // Body is intentionally empty {} — confirmedBy is server-trusted from the JWT `sub` (api-contract §4.1).
    // carry-forward: `http-adapter:request-body-field-whitelist` — do NOT send caregiverId/tenantId.
    return this.http.post<ConfirmationResultWire>(
      `${this.base}/events/${eventId}/confirmation`,
      {},  // empty body — confirmedBy = JWT sub server-side
    );
  }

  recordFeedback(eventId: string, req: FeedbackRequestWire): Observable<FeedbackResultWire> {
    return this.http.post<FeedbackResultWire>(
      `${this.base}/events/${eventId}/feedback`,
      { verdict: req.verdict },  // only `verdict` sent (api-contract §5.1)
    );
  }

  listEscalationAttempts(eventId: string): Observable<EscalationTrailWire> {
    return this.http.get<EscalationTrailWire>(
      `${this.base}/events/${eventId}/escalation-attempts`,
    );
  }
}
