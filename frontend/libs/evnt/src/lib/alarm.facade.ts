import {
  Injectable,
  DestroyRef,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';
import { EVENT_PORT, AlarmEventWire, ConfirmationResultWire, FeedbackRequestWire } from './api/event.port';

// ── View-model types (SPEC-03) ────────────────────────────────────────────────

export type AlarmState =
  | 'loading'       // initial — projection not yet read
  | 'none'          // successful read returned activeAlarm: null (a POSITIVE server answer)
  | 'active'        // active unconfirmed emergency
  | 'acknowledging' // confirm write in flight
  | 'acknowledged'  // transient session feedback after a successful confirm
  | 'error';        // confirm write failed — alarm stays active, never cleared

export type PollingState =
  | 'live'           // foreground + online + poll within budget
  | 'paused-hidden'  // tab backgrounded (browser throttles timers — SPEC-04 §5.3)
  | 'offline'        // navigator offline or transport error (SPEC-04 §5.4)
  | 'stale';         // successive polls stopped advancing / serverTime skew

export interface AlarmVM {
  state: AlarmState;
  eventId: string | null;
  patientId: string | null;
  patientName: string;      // resolved placeholder until ACS-join is wired (G-EVNT-6)
  commandLabel: string;
  detectedAt: string | null;
  canConfirm: boolean;      // set by the shell via canConfirmEventGuard (SPEC-01)
}

export interface AcknowledgedVM {
  eventId: string;
  patientName: string;
  confirmedAt: string;
  confirmedByName: string;
}

export interface MonitoringVM {
  polling: PollingState;
  lastPolledAt: string | null;
  pollIntervalSeconds: number;
  foregroundRequired: boolean;
  message: string;
}

export interface RoutineNoticeVM {
  eventId: string;
  patientName: string;
  commandLabel: string;
  requestedAt: string;
  feedback: 'not_evaluated' | 'real' | 'false_positive';
  seen: boolean;
  canRecordFeedback: boolean; // set by shell / consumer
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_POLL_INTERVAL_S = 3;
const ROUTINE_POLL_INTERVAL_S = 10;
const STALE_MULTIPLIER = 3;  // stale after N consecutive missed fast-interval windows

function pollingMessage(state: PollingState): string {
  switch (state) {
    case 'live':          return '';
    case 'paused-hidden': return 'Monitoring paused — keep this window in front to receive alarms.';
    case 'offline':       return 'No connection — alarm delivery delayed. Reconnecting…';
    case 'stale':         return 'Alarm status may be delayed — could not reach the server.';
  }
}

// ── Facade ────────────────────────────────────────────────────────────────────

/**
 * AlarmFacade — EVNT live projection.
 *
 * SAFETY contract (SPEC-04 §5, ADR-005):
 *  - Polls GET /evnt/patients/{id}/active-alarm at the SERVER-ADVERTISED `pollIntervalSeconds`.
 *  - WHEN the tab becomes visible or connectivity returns: IMMEDIATE poll.
 *  - WHILE degraded (hidden / offline / stale): holds the last known alarm state.
 *  - NEVER sets AlarmState='none' unless a poll SUCCEEDED and returned activeAlarm: null.
 *  - NEVER clears the alarm on a timer, a tab-hidden event, or an offline event.
 *
 * Usage: inject AlarmFacade, call startMonitoring(patientIds) once from the shell init.
 */
@Injectable({ providedIn: 'root' })
export class AlarmFacade {
  private readonly port = inject(EVENT_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Internal signals ───────────────────────────────────────────────────────

  private readonly _patientIds = signal<string[]>([]);
  private readonly _pollingState = signal<PollingState>('live');
  private readonly _lastPolledAt = signal<string | null>(null);
  private readonly _pollIntervalSeconds = signal(DEFAULT_POLL_INTERVAL_S);

  // undefined = not yet polled (renders as 'loading')
  // null      = polled + no active alarm
  // wire obj  = active alarm
  private readonly _alarmWire = signal<AlarmEventWire | null | undefined>(undefined);
  private readonly _confirmedWire = signal<ConfirmationResultWire | null>(null);
  private readonly _acknowledging = signal(false);
  private readonly _confirmError = signal<string | null>(null);
  private readonly _routineNotices = signal<RoutineNoticeVM[]>([]);
  private readonly _seenEventIds = signal<Set<string>>(new Set());
  private readonly _canConfirm = signal(false);  // updated by the shell / guard

  // ── Polling internals ─────────────────────────────────────────────────────

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private routinePollTimer: ReturnType<typeof setTimeout> | null = null;
  private monitoring = false;

  // ── Public VM signals ──────────────────────────────────────────────────────

  readonly alarmVm = computed<AlarmVM>(() => {
    const wire = this._alarmWire();
    const confirmedWire = this._confirmedWire();
    const acknowledging = this._acknowledging();
    const confirmError = this._confirmError();

    // error state: confirm failed — alarm stays active (SPEC-04 §4, ADR-005 §Decision 2)
    if (confirmError) {
      return {
        state: 'error',
        eventId: wire?.id ?? null,
        patientId: wire?.patientId ?? null,
        patientName: this.resolvePatientName(wire?.patientId),
        commandLabel: wire?.commandLabel ?? '',
        detectedAt: wire?.occurredAt ?? null,
        canConfirm: this._canConfirm(),
      };
    }

    if (acknowledging) {
      return {
        state: 'acknowledging',
        eventId: wire?.id ?? null,
        patientId: wire?.patientId ?? null,
        patientName: this.resolvePatientName(wire?.patientId),
        commandLabel: wire?.commandLabel ?? '',
        detectedAt: wire?.occurredAt ?? null,
        canConfirm: false, // disabled while in-flight (SPEC-02 §1)
      };
    }

    if (confirmedWire) {
      return {
        state: 'acknowledged',
        eventId: confirmedWire.id,
        patientId: wire?.patientId ?? null,
        patientName: this.resolvePatientName(wire?.patientId),
        commandLabel: wire?.commandLabel ?? '',
        detectedAt: wire?.occurredAt ?? null,
        canConfirm: false,
      };
    }

    // undefined = initial loading state (not yet polled)
    if (wire === undefined) {
      return {
        state: 'loading',
        eventId: null,
        patientId: null,
        patientName: '',
        commandLabel: '',
        detectedAt: null,
        canConfirm: false,
      };
    }

    // null = successful read, no active alarm (POSITIVE server answer)
    if (wire === null) {
      return {
        state: 'none',
        eventId: null,
        patientId: null,
        patientName: '',
        commandLabel: '',
        detectedAt: null,
        canConfirm: false,
      };
    }

    // Active alarm wire present
    return {
      state: 'active',
      eventId: wire.id,
      patientId: wire.patientId,
      patientName: this.resolvePatientName(wire.patientId),
      commandLabel: wire.commandLabel,
      detectedAt: wire.occurredAt,
      canConfirm: this._canConfirm(),
    };
  });

  readonly acknowledgedVm = computed<AcknowledgedVM | null>(() => {
    const c = this._confirmedWire();
    if (!c) return null;
    return {
      eventId: c.id,
      patientName: this.resolvePatientName(this._alarmWire()?.patientId),
      confirmedAt: c.confirmedAt,
      confirmedByName: 'you', // G-EVNT-6: name resolved from session in full impl
    };
  });

  readonly monitoringVm = computed<MonitoringVM>(() => {
    const state = this._pollingState();
    return {
      polling: state,
      lastPolledAt: this._lastPolledAt(),
      pollIntervalSeconds: this._pollIntervalSeconds(),
      foregroundRequired: state !== 'live',
      message: pollingMessage(state),
    };
  });

  readonly routineNoticesVm = computed<RoutineNoticeVM[]>(() => this._routineNotices());

  readonly activeEmergency = computed(() => {
    const vm = this.alarmVm();
    return vm.state === 'active' ? vm : null;
  });

  readonly routineNoticeCount = computed(() =>
    this._routineNotices().filter(n => !n.seen).length,
  );

  // ── Setup ──────────────────────────────────────────────────────────────────

  /**
   * Start monitoring for the given patient ids.
   * Call once from the shell EVNT init after the caregiver session is loaded.
   * Safe to call multiple times (idempotent via the monitoring guard).
   */
  startMonitoring(patientIds: string[]): void {
    if (!isPlatformBrowser(this.platformId) || patientIds.length === 0) return;
    this._patientIds.set(patientIds);

    if (!this.monitoring) {
      this.monitoring = true;
      this.wireVisibilityAndConnectivity();
    }

    // Immediate first poll; subsequent polls are scheduled inside pollCycle.
    this.pollCycle();
    this.scheduleRoutinePoll();
  }

  /** Update the canConfirm flag from the guard/shell. */
  setCanConfirm(value: boolean): void {
    this._canConfirm.set(value);
  }

  /** Stop monitoring and clear state (called by EVNT destroy). */
  stopMonitoring(): void {
    this.clearTimers();
    this.monitoring = false;
    this._alarmWire.set(undefined);
    this._confirmedWire.set(null);
    this._pollingState.set('live');
    this._lastPolledAt.set(null);
  }

  // ── Polling loop (SAFETY) ──────────────────────────────────────────────────

  private pollCycle(): void {
    if (!this.monitoring || document.hidden || !navigator.onLine) return;
    this.pollOnce();
  }

  private pollOnce(): void {
    const patientIds = this._patientIds();
    if (patientIds.length === 0) return;

    // Poll for each linked patient; take the first active emergency found.
    // Pilot family tenant has one patient — this loop resolves to one call (SPEC-01 §1.1).
    const patientId = patientIds[0]; // scaffold: single-patient family tenant
    this.port.getActiveAlarm(patientId).subscribe({
      next: envelope => {
        // Adopt server-advertised interval (SPEC-04 §5.1 — NEVER hardcode cadence)
        if (envelope.pollIntervalSeconds > 0) {
          this._pollIntervalSeconds.set(envelope.pollIntervalSeconds);
        }
        this._lastPolledAt.set(envelope.serverTime);

        if (envelope.activeAlarm) {
          // Active emergency: check not already confirmed in this session
          const alreadyConfirmed =
            this._confirmedWire()?.id === envelope.activeAlarm.id;
          if (!alreadyConfirmed) {
            this._alarmWire.set(envelope.activeAlarm);
          }
        } else {
          // POSITIVE all-clear — only now is it safe to show 'none' (SPEC-04 §5, ADR-005)
          this._alarmWire.set(null);
          this._confirmedWire.set(null); // clear session feedback once server confirms no alarm
          this._confirmError.set(null);
        }

        this._pollingState.set('live');
        this.scheduleNextPoll();
      },
      error: () => {
        // Transport error: hold last known state, mark offline (SPEC-04 §5.4)
        // NEVER set alarmWire to null on a failed read.
        this._pollingState.set('offline');
        // Retry after a backoff: 2× the normal interval (capped at 30 s)
        const backoffMs = Math.min(this._pollIntervalSeconds() * 2000, 30_000);
        this.pollTimer = setTimeout(() => this.pollCycle(), backoffMs);
      },
    });
  }

  private scheduleNextPoll(): void {
    this.clearPollTimer();
    if (!this.monitoring || document.hidden || !navigator.onLine) return;
    const ms = this._pollIntervalSeconds() * 1000;
    this.pollTimer = setTimeout(() => this.pollCycle(), ms);
  }

  private scheduleRoutinePoll(): void {
    this.clearRoutineTimer();
    if (!this.monitoring || document.hidden || !navigator.onLine) return;
    this.routinePollTimer = setTimeout(() => {
      this.pollRoutineNotices();
      this.scheduleRoutinePoll();
    }, ROUTINE_POLL_INTERVAL_S * 1000);
  }

  private pollRoutineNotices(): void {
    const patientIds = this._patientIds();
    if (patientIds.length === 0) return;
    const patientId = patientIds[0];

    this.port.listPatientEvents(patientId).subscribe({
      next: page => {
        const seenIds = this._seenEventIds();
        const notices: RoutineNoticeVM[] = page.events
          .filter(e => e.urgency === 'routine')
          .map(e => ({
            eventId: e.id,
            patientName: this.resolvePatientName(patientId),
            commandLabel: e.commandLabel,
            requestedAt: e.occurredAt,
            feedback: e.feedback,
            seen: seenIds.has(e.id),
            canRecordFeedback: false, // set by consumer via AccessDecisionService
          }));
        this._routineNotices.set(notices);
      },
      error: () => { /* best-effort; routine notices are not SAFETY-critical */ },
    });
  }

  // ── Visibility + connectivity wiring (SAFETY, SPEC-04 §5.3/§5.4) ─────────

  private wireVisibilityAndConnectivity(): void {
    // Page Visibility (SPEC-04 §5.3)
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.hidden) {
          this.clearTimers();
          this._pollingState.set('paused-hidden');
          // NEVER clear alarm state when hiding — SPEC-04 §5.3 invariant
        } else {
          // IMMEDIATE poll on becoming visible (SPEC-04 §5.3)
          this._pollingState.set('live');
          this.pollCycle();
          this.scheduleRoutinePoll();
        }
      });

    // Connectivity (SPEC-04 §5.4)
    merge(
      fromEvent(window, 'offline'),
      fromEvent(window, 'online'),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!navigator.onLine) {
          this.clearTimers();
          this._pollingState.set('offline');
          // NEVER clear alarm state on offline — SPEC-04 §5.4 invariant
        } else {
          // IMMEDIATE poll on reconnect (SPEC-04 §5.4)
          this._pollingState.set('live');
          this.pollCycle();
          this.scheduleRoutinePoll();
        }
      });
  }

  // ── Write operations ───────────────────────────────────────────────────────

  /**
   * Confirm an emergency alarm.
   * confirm-then-clear default: await 200 before clearing (ADR-005 §Decision 2).
   * On failure: alarm stays active, never dismissed (SAFETY invariant).
   */
  confirmAlarm(eventId: string): void {
    this._acknowledging.set(true);
    this._confirmError.set(null);

    this.port.confirmAlarm(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this._acknowledging.set(false);
          this._confirmedWire.set(result);
          // The alarm will be cleared on the next successful poll that returns activeAlarm: null.
          // We do NOT clear it here eagerly — the next poll cycle will reflect the true server state.
        },
        error: err => {
          // SAFETY: on failure, alarm MUST stay active (ADR-005 §Decision 2)
          this._acknowledging.set(false);
          this._confirmError.set(err?.message ?? 'Failed to confirm. The alarm is still active.');
          // Do NOT clear _alarmWire or set state='none' — the takeover stays up.
        },
      });
  }

  /** Record feedback (false_positive / real) — evnt.event.record (D-639). */
  recordFeedback(eventId: string, verdict: 'real' | 'false_positive'): void {
    this.port.recordFeedback(eventId, { verdict })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => { /* pessimistic — no optimistic update */ }, error: () => {} });
  }

  /** Mark a routine notice as locally seen (feature-local dismissal, SPEC-04 §3). */
  dismissRoutineNotice(eventId: string): void {
    this._seenEventIds.update(s => new Set([...s, eventId]));
    this._routineNotices.update(list =>
      list.map(n => n.eventId === eventId ? { ...n, seen: true } : n),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Resolve patient display name from the patientId.
   * G-EVNT-6: the BE event payload does not carry a name — this resolves from the session/ACS link.
   * Scaffold: returns a neutral label; wire to PatientFacade in the implement cycle (FE-EVNT-010).
   */
  private resolvePatientName(patientId?: string | null): string {
    if (!patientId) return 'the patient'; // neutral label — carry-forward `fe-facade:fabricated-null-fields`
    // TODO[FE-EVNT-010]: inject PatientFacade and resolve name from patientId
    return 'your patient';
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) { clearTimeout(this.pollTimer); this.pollTimer = null; }
  }

  private clearRoutineTimer(): void {
    if (this.routinePollTimer !== null) { clearTimeout(this.routinePollTimer); this.routinePollTimer = null; }
  }

  private clearTimers(): void {
    this.clearPollTimer();
    this.clearRoutineTimer();
  }
}
