import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror BE api-contract §3–§5 (evnt-service).
// Paths used by the HTTP adapter follow the FE API CONTRACT, not the generated BE controllers
// (known per-op path/verb mismatches — carry-forward `http-adapter:wrong-prefix`).
// Base: ${ACCESS_HTTP_BASE}/evnt  (NOT /api/v1)

export type Urgency  = 'emergency' | 'routine';
export type Feedback = 'not_evaluated' | 'real' | 'false_positive';

// ── Active-alarm envelope (GET /evnt/patients/{id}/active-alarm) §3.1 ─────────
export interface ActiveAlarmEnvelopeWire {
  activeAlarm: AlarmEventWire | null;  // null = no active emergency (a POSITIVE server answer)
  serverTime: string;                  // ISO; used for skew/stalled-loop detection
  pollIntervalSeconds: number;         // server-advertised cadence (default 3) — the FE ADOPTS it
}

export interface AlarmEventWire {
  id: string;
  patientId: string;
  commandId: string;
  commandLabel: string;
  urgency: Urgency;
  occurredAt: string;
  confirmedAt: string | null;
  feedback: Feedback;
}

// ── Patient events page (GET /evnt/patients/{id}/events) §3.2 ─────────────────
export interface PatientEventsPageWire {
  events: EventRowWire[];
  nextBefore: string | null;  // keyset page cursor by occurredAt
}

export interface EventRowWire {
  id: string;
  commandLabel: string;
  urgency: Urgency;
  occurredAt: string;
  confirmedAt: string | null;
  feedback: Feedback;
}

// ── Single event (GET /evnt/events/{id}) ──────────────────────────────────────
export type EventDetailWire = AlarmEventWire;

// ── Confirmation (POST /evnt/events/{id}/confirmation) §4.1 ──────────────────
// Request body is EMPTY — confirmedBy is server-trusted from the JWT `sub` (api-contract §4.1)
export interface ConfirmationResultWire {
  id: string;
  urgency: 'emergency';
  confirmedAt: string;
  confirmedBy: string;  // caregiver id
  feedback: Feedback;
}

// ── Feedback (POST /evnt/events/{id}/feedback) §5.1 ──────────────────────────
export interface FeedbackRequestWire  { verdict: 'real' | 'false_positive'; }
export interface FeedbackResultWire   { id: string; feedback: Feedback; }

// ── Escalation trail (GET /evnt/events/{id}/escalation-attempts) §3.4 ────────
export type EscalationChannel = 'web_push' | 'sms' | 'voice';
export type EscalationStatus  = 'sent' | 'failed';

export interface EscalationAttemptWire {
  tier: 0 | 1 | 2;
  channel: EscalationChannel;
  caregiverId: string;
  target: string;                    // ALREADY MASKED BE-side — never unmask
  status: EscalationStatus;
  providerMessageId?: string;
  errorReason?: string;
  attemptedAt: string;
}

export interface EscalationTrailWire {
  eventId: string;
  urgency: 'emergency';
  attempts: EscalationAttemptWire[];
}

// ── Port ──────────────────────────────────────────────────────────────────────

export interface EventPort {
  /** GET /evnt/patients/{patientId}/active-alarm — SAFETY: poll at server-advertised cadence. */
  getActiveAlarm(patientId: string): Observable<ActiveAlarmEnvelopeWire>;
  /** GET /evnt/patients/{patientId}/events?urgency=routine&limit=20 — routine-notice feed. */
  listPatientEvents(patientId: string, limit?: number): Observable<PatientEventsPageWire>;
  /** GET /evnt/events/{eventId} — on-demand read. */
  getEvent(eventId: string): Observable<EventDetailWire>;
  /**
   * POST /evnt/events/{eventId}/confirmation — body is EMPTY {} (confirmedBy from JWT).
   * confirm-then-clear default: await 200 before clearing alarm (ADR-005 §Decision 2).
   * BE is idempotent on the same event (api-contract §4.1 — INV-EVNT-5).
   */
  confirmAlarm(eventId: string): Observable<ConfirmationResultWire>;
  /**
   * POST /evnt/events/{eventId}/feedback — body { verdict }.
   * evnt.event.record authority (D-639; NOT evnt.event.feedback — INV-EVNT-7 reconciliation).
   */
  recordFeedback(eventId: string, req: FeedbackRequestWire): Observable<FeedbackResultWire>;
  /** GET /evnt/events/{eventId}/escalation-attempts — evnt.escalation.read. */
  listEscalationAttempts(eventId: string): Observable<EscalationTrailWire>;
}

export const EVENT_PORT = new InjectionToken<EventPort>('EventPort');
