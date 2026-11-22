import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  HistoryPort,
  HistoryPageWire,
  HistoryEntryWire,
  PeriodSummaryWire,
  HistoryQueryParams,
} from './history.port';

// Mock seed — wire-shaped fixtures mirroring the prototype mock-data.ts.
// All clock references are relative to a fixed baseline to keep data stable (carry-forward `fe-mock:stable-time`).
// Seed matches prototype events (evt-001..evt-009), adapted to wire shape (HistoryEntryWire).

const BASELINE = '2026-11-20T12:00:00Z';

function iso(offsetHours: number): string {
  const d = new Date(BASELINE);
  d.setTime(d.getTime() + offsetHours * 3600 * 1000);
  return d.toISOString();
}

// Wire-shaped history entries (newest-first).
// EventGenerated entries include server-side-folded confirmation when applicable (G-HIST-2).
const MOCK_ENTRIES: HistoryEntryWire[] = [
  // evt-009: active unconfirmed emergency (most recent)
  {
    id: 'ar-009',
    kind: 'EventGenerated',
    source: 'evnt-service',
    subjectType: 'event',
    subjectId: 'evt-009',
    relatedEventId: 'evt-009',
    occurredAt: iso(-2),         // 2 hours ago — in today and week windows
    title: 'Help request',
    detail: "Patient signalled 'Help'",
    commandId: 'cmd-help',
    commandLabel: 'Help',
    urgency: 'emergency',
    outcome: 'not_evaluated',
    // confirmation absent → not yet confirmed
  },
  // evt-008: confirmed emergency, 4 hours ago
  {
    id: 'ar-008',
    kind: 'EventGenerated',
    source: 'evnt-service',
    subjectType: 'event',
    subjectId: 'evt-008',
    relatedEventId: 'evt-008',
    occurredAt: iso(-4),
    title: 'Help request',
    detail: "Patient signalled 'Help'",
    commandId: 'cmd-help',
    commandLabel: 'Help',
    urgency: 'emergency',
    confirmation: { confirmedAt: iso(-3.95), confirmedBy: 'cg-jamilly' },
    outcome: 'real',
  },
  // evt-007: routine Water — yesterday
  {
    id: 'ar-007',
    kind: 'EventGenerated',
    source: 'evnt-service',
    subjectType: 'event',
    subjectId: 'evt-007',
    relatedEventId: 'evt-007',
    occurredAt: iso(-20),        // yesterday (in week window)
    title: 'Routine request',
    detail: "Patient signalled 'Water'",
    commandId: 'cmd-water',
    commandLabel: 'Water',
    urgency: 'routine',
    confirmation: { confirmedAt: iso(-19.9), confirmedBy: 'cg-jamilly' },
    outcome: 'real',
  },
  // evt-006: false positive, 2 days ago
  {
    id: 'ar-006',
    kind: 'EventGenerated',
    source: 'evnt-service',
    subjectType: 'event',
    subjectId: 'evt-006',
    relatedEventId: 'evt-006',
    occurredAt: iso(-51),        // 2 days ago (in week window)
    title: 'Routine request',
    detail: "Patient signalled 'Frog'",
    commandId: 'cmd-frog',
    commandLabel: 'Frog',
    urgency: 'routine',
    outcome: 'false_positive',
  },
  // escalation attempt on evt-009 — safety surface (channel/maskedTarget)
  {
    id: 'ar-escalation-001',
    kind: 'EscalationAttempted',
    source: 'evnt-service',
    subjectType: 'event',
    subjectId: 'evt-009',
    relatedEventId: 'evt-009',
    occurredAt: iso(-1.9),
    title: 'Escalation attempted',
    detail: 'Tier 1 SMS to linked caregiver',
    channel: 'sms',
    maskedTarget: '+55•••••1234',  // ALREADY masked BE-side — render verbatim, never unmask
    outcome: 'sent',
  },
  // detection-lapse entry — safety surface, informational styling (never --color-alarm)
  {
    id: 'ar-lapse-001',
    kind: 'DetectionLapseStarted',
    source: 'edge-service',
    subjectType: 'edge-device',
    subjectId: 'edge-marcio-01',
    occurredAt: iso(-6),
    title: 'Detection lapse started',
    detail: 'Edge device lost camera access — monitoring paused',
    outcome: 'started',
  },
  // evt-005: Water, 3 days ago (in week window)
  {
    id: 'ar-005',
    kind: 'EventGenerated',
    source: 'evnt-service',
    subjectType: 'event',
    subjectId: 'evt-005',
    relatedEventId: 'evt-005',
    occurredAt: iso(-75),        // 3 days ago
    title: 'Routine request',
    detail: "Patient signalled 'Water'",
    commandId: 'cmd-water',
    commandLabel: 'Water',
    urgency: 'routine',
    confirmation: { confirmedAt: iso(-74.9), confirmedBy: 'cg-jamilly' },
    outcome: 'real',
  },
];

// Period window helpers
function windowForPeriod(period: string): { from: string; to: string } {
  const now = new Date(BASELINE);
  let from = new Date(now);
  if (period === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }
  return { from: from.toISOString(), to: now.toISOString() };
}

function filterByWindow(entries: HistoryEntryWire[], from: string, to: string): HistoryEntryWire[] {
  return entries.filter(e => e.occurredAt >= from && e.occurredAt <= to);
}

function buildSummary(entries: HistoryEntryWire[], period: string, window: { from: string; to: string }): PeriodSummaryWire {
  const events = entries.filter(e => e.kind === 'EventGenerated');
  return {
    scope: 'period',
    window,
    counts: {
      EventGenerated: events.length,
      AlarmConfirmed: events.filter(e => e.confirmation != null).length,
      EscalationAttempted: entries.filter(e => e.kind === 'EscalationAttempted').length,
      DetectionLapseStarted: entries.filter(e => e.kind === 'DetectionLapseStarted').length,
    },
    events: {
      total: events.length,
      confirmed: events.filter(e => e.confirmation != null).length,
      unconfirmed: events.filter(e => e.confirmation == null).length,
      markedReal: events.filter(e => e.outcome === 'real').length,
      falsePositives: events.filter(e => e.outcome === 'false_positive').length,
      notReviewed: events.filter(e => e.outcome === 'not_evaluated').length,
    },
  };
}

@Injectable({ providedIn: 'root' })
export class HistoryMockAdapter implements HistoryPort {

  getHistory(patientId: string, params: HistoryQueryParams = {}): Observable<HistoryPageWire> {
    const period = params.period ?? 'today';
    const window = windowForPeriod(period);
    const filtered = filterByWindow(MOCK_ENTRIES, window.from, window.to);
    // keyset pagination: return up to `size` entries
    const size = params.size ?? 20;
    const page = filtered.slice(0, size);
    const nextCursor = filtered.length > size ? btoa(`cursor:${size}`) : null;

    return of({
      patientId,
      window,
      summary: buildSummary(page, period, window),  // first page always has summary in mock
      entries: page,
      nextCursor,
    }).pipe(delay(400));
  }
}
