import {
  Injectable,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  HISTORY_PORT,
  PeriodFilter,
  HistoryEntryWire,
  PeriodSummaryWire,
} from './api/history.port';

// ── View-model types (SPEC-03) ────────────────────────────────────────────────

export type HistoryEntryKind = 'event' | 'escalation' | 'detection-lapse' | 'confirmation' | 'feedback';
export type HistoryViewState = 'loading' | 'list' | 'empty' | 'error';

export interface HistoryEntryVM {
  id: string;
  kind: HistoryEntryKind;
  occurredAt: string;        // raw ISO — component formats for display
  title: string;             // BE-composed
  detail: string;            // BE-composed
  // event fields:
  commandLabel?: string;     // family's word ("Water") — verbatim from wire; absent → show title
  urgency?: 'emergency' | 'routine';
  relatedEventId?: string;   // join key (G-HIST-2 CLOSED)
  confirmation?: 'confirmed' | 'not-yet-confirmed';
  confirmedAt?: string;
  feedbackOutcome?: 'real' | 'false_positive' | 'not_evaluated';
  canRecordFeedback: boolean; // drives the delegated feedback affordance (SPEC-05 §4)
  // escalation fields:
  channel?: 'web_push' | 'sms' | 'voice';
  maskedTarget?: string;     // ALREADY masked BE-side — render verbatim, NEVER unmask
  // detection-lapse fields:
  lapseState?: 'started' | 'resolved' | 'acknowledged';
  isSafetySurface: boolean;  // true for escalation | detection-lapse → informational styling, NEVER emergency
}

export interface PeriodSummaryVM {
  period: PeriodFilter;
  scope: 'period' | 'loaded';
  eventsInPeriod: number;
  confirmed: number;
  markedReal: number;
  falsePositives: number;
  notReviewed: number;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function kindOf(e: HistoryEntryWire): HistoryEntryKind {
  if (e.kind === 'EscalationAttempted') return 'escalation';
  if (e.kind.startsWith('DetectionLapse')) return 'detection-lapse';
  if (e.kind === 'AlarmConfirmed') return 'confirmation';
  if (e.kind === 'FeedbackRecorded') return 'feedback';
  return 'event'; // EventGenerated and anything unrecognised
}

function mapEntryToVM(e: HistoryEntryWire): HistoryEntryVM {
  const kind = kindOf(e);
  const feedbackOutcome =
    e.outcome === 'real' || e.outcome === 'false_positive' || e.outcome === 'not_evaluated'
      ? e.outcome
      : undefined;

  // canRecordFeedback: surfaced on event entries where feedback has not yet been recorded.
  // The write is delegated to EVNT via the shell (SPEC-04 §4, SPEC-06 §3).
  // TODO[FE-HIST-002]: gate on AccessDecisionService.can('evnt.event.record') (SPEC-05 §4).
  const canRecordFeedback =
    kind === 'event' && (e.outcome === 'not_evaluated' || e.outcome == null);

  const lapseState =
    kind === 'detection-lapse'
      ? (e.outcome as 'started' | 'resolved' | 'acknowledged' | undefined)
      : undefined;

  return {
    id: e.id,
    kind,
    occurredAt: e.occurredAt,
    title: e.title,
    detail: e.detail,
    commandLabel: e.commandLabel,
    urgency: e.urgency,
    relatedEventId: e.relatedEventId,
    confirmation: kind === 'event'
      ? (e.confirmation ? 'confirmed' : 'not-yet-confirmed')
      : undefined,
    confirmedAt: e.confirmation?.confirmedAt,
    feedbackOutcome,
    canRecordFeedback,
    channel: e.channel,
    maskedTarget: e.maskedTarget,
    lapseState,
    isSafetySurface: kind === 'escalation' || kind === 'detection-lapse',
  };
}

function mapSummaryToVM(wire: PeriodSummaryWire, period: PeriodFilter): PeriodSummaryVM {
  return {
    period,
    scope: 'period',
    eventsInPeriod: wire.events.total,
    confirmed: wire.events.confirmed,
    markedReal: wire.events.markedReal,
    falsePositives: wire.events.falsePositives,
    notReviewed: wire.events.notReviewed,
  };
}

function deriveSummaryFromWindow(entries: HistoryEntryVM[], period: PeriodFilter): PeriodSummaryVM {
  const eventEntries = entries.filter(e => e.kind === 'event');
  return {
    period,
    scope: 'loaded',
    eventsInPeriod: eventEntries.length,
    confirmed: eventEntries.filter(e => e.confirmation === 'confirmed').length,
    markedReal: eventEntries.filter(e => e.feedbackOutcome === 'real').length,
    falsePositives: eventEntries.filter(e => e.feedbackOutcome === 'false_positive').length,
    notReviewed: eventEntries.filter(e => e.feedbackOutcome === 'not_evaluated').length,
  };
}

// ── Facade ────────────────────────────────────────────────────────────────────

/**
 * HistoryFacade — application layer for the HIST module.
 *
 * READ-ONLY (ADR-005): exposes NO mutator of the history record.
 * Methods: load / loadMore / setPeriod / refresh.
 * No polling (doc 05 §2): load on navigation / explicit refresh only.
 *
 * Patient context: setPatientId() is called by HistShellIntegrationService
 * before the first load (SPEC-06 §2).
 *
 * Feedback delegation: the facade emits NO write. The component emits markFeedback;
 * the shell wires it to EVNT's port; on success calls refresh() (SPEC-04 §4, SPEC-06 §3).
 */
@Injectable({ providedIn: 'root' })
export class HistoryFacade {
  private readonly port = inject(HISTORY_PORT);
  private readonly destroyRef = inject(DestroyRef);

  // Private mutable state
  private readonly _state = signal<HistoryViewState>('loading');
  private readonly _entries = signal<HistoryEntryVM[]>([]);
  private readonly _summary = signal<PeriodSummaryVM | null>(null);
  private readonly _period = signal<PeriodFilter>('week');  // FE default: week (prototype parity)
  private readonly _window = signal<{ from: string; to: string } | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _patientId = signal<string | null>(null);
  private _nextCursor: string | null = null;

  // Public read-only projections
  readonly state = this._state.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly period = this._period.asReadonly();
  readonly window = this._window.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly loading = computed(() => this._state() === 'loading');

  /** Set the active patient context (called by HistShellIntegrationService — SPEC-06 §2). */
  setPatientId(id: string): void {
    this._patientId.set(id);
  }

  /**
   * Switch the period filter. Narrowing re-filters in memory; widening triggers a refetch.
   * FE sends the period explicitly to avoid relying on the server default (SPEC-04 §3).
   */
  setPeriod(period: PeriodFilter): void {
    const previous = this._period();
    this._period.set(period);
    this._nextCursor = null;

    // Simple strategy for promote phase: always refetch on period change.
    // TODO[FE-HIST-003]: narrow-period in-memory re-filter per doc 05 §3.
    this.load();
  }

  /** Initial load — called on navigation to /history (SPEC-04 §5). */
  load(): void {
    const patientId = this._patientId();
    if (!patientId) {
      // patientId not yet wired — degrade gracefully; shell will call load() after setPatientId()
      this._state.set('error');
      return;
    }
    this._state.set('loading');
    this._nextCursor = null;
    this.port.getHistory(patientId, { period: this._period() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          const vms = page.entries.map(mapEntryToVM);
          this._entries.set(vms);
          this._window.set(page.window);
          this._hasMore.set(page.nextCursor != null);
          this._nextCursor = page.nextCursor;
          if (page.summary) {
            this._summary.set(mapSummaryToVM(page.summary, this._period()));
          } else {
            // No server summary on first page (unexpected) — derive from loaded window
            this._summary.set(deriveSummaryFromWindow(vms, this._period()));
          }
          // SAFETY: never render empty state on a failed read (SPEC-07 §2 / task constraint)
          this._state.set(vms.length === 0 ? 'empty' : 'list');
        },
        error: () => {
          // Error/degraded state — keep existing window marked stale (SPEC-03 §3)
          this._state.set('error');
        },
      });
  }

  /** Load next page — appends to the current window (keyset, SPEC-04 §3). */
  loadMore(): void {
    const patientId = this._patientId();
    if (!patientId || !this._nextCursor || !this._hasMore()) return;
    this.port.getHistory(patientId, { period: this._period(), cursor: this._nextCursor })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this._entries.update(list => [...list, ...page.entries.map(mapEntryToVM)]);
          this._hasMore.set(page.nextCursor != null);
          this._nextCursor = page.nextCursor;
          if (this._state() === 'empty' && this._entries().length > 0) {
            this._state.set('list');
          }
        },
        error: () => {
          // Degraded: keep existing window; don't reset to error (SPEC-07 §2.1 trailDegraded pattern)
        },
      });
  }

  /**
   * Re-reads the current window (explicit caregiver action or post-EVNT-feedback-write success).
   * HIST does NOT call this on a timer (ADR-005, doc 05 §2).
   * Called by the shell after a delegated EVNT feedback write succeeds (SPEC-04 §4, SPEC-06 §3).
   */
  refresh(): void {
    this.load();
  }
}
