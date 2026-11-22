import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  EventPort,
  ActiveAlarmEnvelopeWire,
  PatientEventsPageWire,
  EventDetailWire,
  ConfirmationResultWire,
  FeedbackRequestWire,
  FeedbackResultWire,
  EscalationTrailWire,
  AlarmEventWire,
  EventRowWire,
} from './event.port';

// Mock seed — wire-shaped fixtures mirroring the prototype mock-data.ts.
// All clock references are relative to a fixed baseline, not `new Date()`,
// so the data is stable across test runs (carry-forward `fe-mock:stable-time`).

const BASELINE = '2026-07-27T14:30:00';

function iso(offset: number): string {
  const d = new Date(BASELINE);
  d.setMinutes(d.getMinutes() + offset);
  return d.toISOString();
}

/** Active unconfirmed emergency (evt-009 equivalent) — the seed for the alarm screen. */
const ACTIVE_ALARM: AlarmEventWire = {
  id: 'evt-009',
  patientId: 'pat-marcio',
  commandId: 'cmd-help',
  commandLabel: 'Help',
  urgency: 'emergency',
  occurredAt: iso(2),
  confirmedAt: null,
  feedback: 'not_evaluated',
};

const ROUTINE_EVENTS: EventRowWire[] = [
  {
    id: 'evt-002',
    commandLabel: 'Water',
    urgency: 'routine',
    occurredAt: iso(-8640), // yesterday
    confirmedAt: iso(-8639),
    feedback: 'real',
  },
  {
    id: 'evt-005',
    commandLabel: 'Water',
    urgency: 'routine',
    occurredAt: iso(-2880), // 2 days ago
    confirmedAt: iso(-2879),
    feedback: 'real',
  },
];

// In-memory mutable state for the mock (confirmations survive within a session)
const mockAlarms = new Map<string, AlarmEventWire>([
  ['evt-009', { ...ACTIVE_ALARM }],
]);

@Injectable({ providedIn: 'root' })
export class EventMockAdapter implements EventPort {

  getActiveAlarm(patientId: string): Observable<ActiveAlarmEnvelopeWire> {
    // Find the most recent unconfirmed emergency for this patient (or null)
    const alarm = [...mockAlarms.values()].find(
      a => a.patientId === patientId && a.confirmedAt === null,
    ) ?? null;

    return of({
      activeAlarm: alarm,
      serverTime: new Date().toISOString(),
      pollIntervalSeconds: 3,  // default server cadence (SPEC-04 §5.1)
    }).pipe(delay(200));
  }

  listPatientEvents(patientId: string, limit = 20): Observable<PatientEventsPageWire> {
    const events = ROUTINE_EVENTS
      .filter(e => e.urgency === 'routine')
      .slice(0, limit);
    return of({ events, nextBefore: null }).pipe(delay(200));
  }

  getEvent(eventId: string): Observable<EventDetailWire> {
    const alarm = mockAlarms.get(eventId);
    if (!alarm) {
      return throwError(() => new Error(`Event ${eventId} not found`));
    }
    return of({ ...alarm }).pipe(delay(200));
  }

  confirmAlarm(eventId: string): Observable<ConfirmationResultWire> {
    const alarm = mockAlarms.get(eventId);
    if (!alarm) {
      return throwError(() => new Error(`Event ${eventId} not found`));
    }
    const confirmedAt = new Date().toISOString();
    const updated: AlarmEventWire = {
      ...alarm,
      confirmedAt,
      confirmedBy: 'cg-jamilly',
      feedback: 'real',
    };
    mockAlarms.set(eventId, updated);
    return of({
      id: eventId,
      urgency: 'emergency',
      confirmedAt,
      confirmedBy: 'cg-jamilly',
      feedback: 'real',
    } as ConfirmationResultWire).pipe(delay(300));
  }

  recordFeedback(eventId: string, req: FeedbackRequestWire): Observable<FeedbackResultWire> {
    const alarm = mockAlarms.get(eventId);
    if (alarm) {
      mockAlarms.set(eventId, { ...alarm, feedback: req.verdict });
    }
    return of({ id: eventId, feedback: req.verdict }).pipe(delay(200));
  }

  listEscalationAttempts(eventId: string): Observable<EscalationTrailWire> {
    return of({
      eventId,
      urgency: 'emergency',
      attempts: [
        {
          tier: 0,
          channel: 'web_push',
          caregiverId: 'cg-jamilly',
          target: 'sub:chrome-…',           // already masked
          status: 'sent',
          attemptedAt: new Date().toISOString(),
        },
        {
          tier: 1,
          channel: 'sms',
          caregiverId: 'cg-jamilly',
          target: '+55•••••1234',            // masked — INT-EVNT-ACS-001 not yet closed
          status: 'failed',
          errorReason: 'no-contact',
          attemptedAt: new Date().toISOString(),
        },
      ],
    }).pipe(delay(200));
  }
}
