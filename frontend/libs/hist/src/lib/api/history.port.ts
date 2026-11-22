import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Wire types mirror BE api-contract §2 (hist-service).
// Base: ${ACCESS_HTTP_BASE}/hist  (NOT /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// HIST is READ-ONLY: this port exposes ZERO write methods (ADR-005, SPEC-04 §3).
// Feedback write is DELEGATED to EVNT via the shell (SPEC-04 §4, SPEC-06 §3).

export type PeriodFilter = 'today' | 'week' | 'month';

export interface HistoryEntryWire {
  id: string;
  kind: string;             // BE fact name: EventGenerated | AlarmConfirmed | FeedbackRecorded |
                            //   EscalationAttempted | DetectionLapseStarted | DetectionLapseResolved |
                            //   DetectionLapseAcknowledged
  source: string;           // producer service id — used to disambiguate DetectionLapseResolved (BE §2, R4)
  subjectType: string;      // 'event' | 'detection-lapse' | 'edge-device' | …
  subjectId: string;        // stable subject id (event entries → eventId)
  relatedEventId?: string;  // = subjectId for event-subject entries — JOIN KEY (G-HIST-2 CLOSED)
  occurredAt: string;       // ISO instant, producer-side
  title: string;            // BE-composed human title
  detail: string;           // BE-composed human detail
  commandId?: string;       // event-kind entries — opaque PAT command ref (G-HIST-1)
  commandLabel?: string;    // event-kind entries — family's word ("Water"); absent → FE shows title (G-HIST-1)
  urgency?: 'emergency' | 'routine';
  confirmation?: {          // server-side fold onto the EventGenerated entry (G-HIST-2 CLOSED)
    confirmedAt: string;
    confirmedBy: string;
  };
  channel?: 'web_push' | 'sms' | 'voice';  // EscalationAttempted (G-HIST-3 CLOSED)
  maskedTarget?: string;    // EscalationAttempted — ALREADY masked BE-side; render verbatim, NEVER unmask
  outcome?: 'real' | 'false_positive' | 'not_evaluated' | 'sent' | 'failed' | 'started' | 'resolved' | 'acknowledged';
}

export interface PeriodSummaryWire {
  scope: 'period';
  window: { from: string; to: string };
  counts: Record<string, number>;
  events: {
    total: number;
    confirmed: number;
    unconfirmed: number;
    markedReal: number;
    falsePositives: number;
    notReviewed: number;
  };
}

export interface HistoryPageWire {
  patientId: string;
  window: { from: string; to: string };
  summary?: PeriodSummaryWire;   // first page only (cursor absent); whole-period aggregate (G-HIST-4 CLOSED)
  entries: HistoryEntryWire[];   // newest-first (occurredAt desc, id desc)
  nextCursor: string | null;     // keyset cursor; null → last page
}

export interface HistoryQueryParams {
  period?: PeriodFilter;         // mutually exclusive with from/to
  from?: string;                 // explicit range — both required together (BE §2)
  to?: string;
  cursor?: string;               // keyset pagination
  size?: number;                 // 1..100; default 20
}

/** HistoryPort — HIST module's only outgoing port.
 * READ-ONLY by design (ADR-005, SPEC-04 §3).
 * Zero write methods. Feedback write belongs to EVNT.
 */
export interface HistoryPort {
  /**
   * GET /hist/patients/{patientId}/history
   * authority: hist.history.read
   * Returns the caregiver timeline: events, confirmations, feedback, escalations, detection-lapse facts.
   * First page (cursor absent) includes summary over the whole period (G-HIST-4).
   */
  getHistory(patientId: string, params?: HistoryQueryParams): Observable<HistoryPageWire>;
}

export const HISTORY_PORT = new InjectionToken<HistoryPort>('HistoryPort');
