import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { HistShellIntegrationService } from '@neuroassist/hist';
import { AlarmFacade } from '@neuroassist/evnt';
import { DeviceFacade } from '@neuroassist/edge';
import { PatientFacade, CommandFacade } from '@neuroassist/pat';
import { DetectionLapseAdapter } from './integration/detection-lapse.adapter';
import {
  SourceHealth,
  CompositeStatus,
  OverviewVM,
  KpiVM,
  CatalogSummaryVM,
  SuggestionVM,
  DASH_EDGE_HEARTBEAT_STALE_MS,
  DASH_HIST_SUMMARY_TTL_MS,
  DASH_PAT_TTL_MS,
  DASH_EVNT_FRESH_FACTOR,
} from './dash.contract';

/**
 * DashboardFacade — composition facade for the DASH module.
 *
 * SAFETY INVARIANTS (ADR-002 / SPEC-03 §4):
 *  INV-1: `compositeStatus === 'all_clear'` ONLY when EVERY source is `ok` and fresh
 *         and affirmatively clear. The fix for the prototype `events.every(confirmed)`
 *         true-on-empty bug lives here.
 *  INV-3: DASH never applies emergency styling. `emergency` state defers to EVNT takeover.
 *  INV-4: A KPI whose source is not `ok` returns `null` — the component renders "—", NEVER 0.
 *
 * DATA CONSTRAINTS (BE ADR-001, SPEC-04 §1):
 *  — NO HttpClient in this facade or anywhere in @neuroassist/dash.
 *  — NO Port/Adapter for DASH HTTP (no dash-service at MVP).
 *  — NO ${ACCESS_HTTP_BASE}/dash, NO /api/v1/dash.
 *  — Compose ONLY from the public index.ts APIs of hist/evnt/edge/pat.
 *
 * DETECTION-LAPSE (INT-FE-DASH-001):
 *  — DetectionLapseAdapter returns `'unknown'` until EVNT FE-EVNT-027/028 ships.
 *  — Consequence: compositeStatus never reaches `all_clear` until then (intentional).
 */
@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  // ── Composed services (public index.ts APIs — NEVER direct HTTP) ─────────────
  private readonly histIntegration = inject(HistShellIntegrationService);
  private readonly alarmFacade = inject(AlarmFacade);
  private readonly deviceFacade = inject(DeviceFacade);
  private readonly patientFacade = inject(PatientFacade);
  private readonly commandFacade = inject(CommandFacade);
  private readonly lapseAdapter = inject(DetectionLapseAdapter);

  // ── Freshness tracking (SPEC-03 §3) ────────────────────────────────────────
  // INT-DASH-2: HIST does not expose a loadedAt timestamp yet — DASH tracks its own tick.
  private readonly _histReadAt = signal<number | null>(null);
  private readonly _edgeReadAt = signal<number | null>(null);
  private readonly _patReadAt = signal<number | null>(null);

  // ── Advisory state ─────────────────────────────────────────────────────────
  private readonly _suggestionDismissed = signal(false);

  constructor() {
    // Track HIST read time: update when the history state settles to a known result.
    effect(() => {
      const state = this.histIntegration.historyState();
      if (state === 'list' || state === 'empty') {
        this._histReadAt.set(Date.now());
      }
      // On error: do NOT update — keep the last known successful read time.
    });

    // Track EDGE read time: update when loading completes without error.
    effect(() => {
      const loading = this.deviceFacade.loading();
      const error = this.deviceFacade.error();
      if (!loading && error === null) {
        this._edgeReadAt.set(Date.now());
      }
    });

    // Track PAT read time: update when loading completes without error.
    effect(() => {
      const loading = this.patientFacade.loading();
      const error = this.patientFacade.error();
      if (!loading && error === null) {
        this._patReadAt.set(Date.now());
      }
    });
  }

  // ── Per-source health signals (SPEC-03 §1) ──────────────────────────────────

  readonly histHealth = computed<SourceHealth>(() => {
    const state = this.histIntegration.historyState();
    if (state === 'loading') return 'loading';
    if (state === 'error') return 'error';
    const readAt = this._histReadAt();
    if (readAt === null) return 'unknown';
    if (Date.now() - readAt > DASH_HIST_SUMMARY_TTL_MS) return 'stale';
    if (state === 'empty') return 'empty';
    return 'ok';
  });

  readonly evntHealth = computed<SourceHealth>(() => {
    const alarm = this.alarmFacade.alarmVm();
    if (alarm.state === 'loading') return 'loading';
    const monitoring = this.alarmFacade.monitoringVm();
    if (monitoring.polling === 'offline') return 'error';
    if (monitoring.polling === 'stale') return 'stale';
    if (!monitoring.lastPolledAt) return 'unknown';
    const freshMs = monitoring.pollIntervalSeconds * DASH_EVNT_FRESH_FACTOR * 1_000;
    if (Date.now() - new Date(monitoring.lastPolledAt).getTime() > freshMs) return 'stale';
    return 'ok';
  });

  readonly edgeHealth = computed<SourceHealth>(() => {
    if (this.deviceFacade.loading()) return 'loading';
    if (this.deviceFacade.error()) return 'error';
    const readAt = this._edgeReadAt();
    if (readAt === null) return 'unknown';
    const device = this.deviceFacade.device();
    if (!device) return 'empty';
    if (!device.lastSyncAt) return 'unknown';
    if (Date.now() - new Date(device.lastSyncAt).getTime() > DASH_EDGE_HEARTBEAT_STALE_MS) return 'stale';
    return 'ok';
  });

  readonly patHealth = computed<SourceHealth>(() => {
    if (this.patientFacade.loading()) return 'loading';
    if (this.patientFacade.error()) return 'error';
    const readAt = this._patReadAt();
    if (readAt === null) return 'unknown';
    if (Date.now() - readAt > DASH_PAT_TTL_MS) return 'stale';
    if (this.patientFacade.items().length === 0) return 'empty';
    return 'ok';
  });

  // ── Composite overview status (SPEC-03 §4, the heart of ADR-002) ───────────

  /**
   * Composite headline status.
   *
   * Rules (each a consequence of the cited safety invariants):
   *  1. `emergency`: EVNT active alarm → DASH defers; never applies emergency style (INV-3).
   *  2. `loading`: any source still in first-load.
   *  3. `degraded`: any source not ok, OR lapse state unknown (cannot confirm detection).
   *  4. `notice`: all sources ok, lapse running, but routine notices present OR lapse open.
   *  5. `all_clear`: every source ok+fresh+clear, lapse running, no notices (INV-1).
   *
   * Prototype bug fixed: `events.every(confirmed)` returned `true` on an empty array,
   * so a failed or empty load rendered a green "X is OK". This derivation never reaches
   * `all_clear` unless every source is explicitly `ok`.
   */
  readonly compositeStatus = computed<CompositeStatus>(() => {
    const hh = this.histHealth();
    const eh = this.evntHealth();
    const edh = this.edgeHealth();
    const ph = this.patHealth();
    const alarm = this.alarmFacade.alarmVm();
    const lapse = this.lapseAdapter.lapseState();

    // 1. Emergency: unconfirmed active emergency — defer to EVNT full-screen takeover.
    // DASH never styles a non-emergency surface as emergency (INV-3).
    if (alarm.state === 'active') return 'emergency';

    // 2. Loading: any source in first-load — headline held, NEVER all_clear (INV-1).
    if ([hh, eh, edh, ph].some(h => h === 'loading')) return 'loading';

    // 3. Degraded: any source not ok.
    if ([hh, eh, edh, ph].some(h => h !== 'ok')) return 'degraded';

    // All sources ok — check detection-lapse state.
    // lapse=unknown means cannot confirm detection → degraded (not all_clear).
    // This is the intended fail-safe while INT-FE-DASH-001 (LapseAlertFacade) is pending.
    if (lapse === 'unknown') return 'degraded';

    // lapse=lapsed means online but not detecting → notice (amber), never emergency.
    if (lapse === 'lapsed') return 'notice';

    // lapse=running. Check for routine notices.
    if (this.alarmFacade.routineNoticesVm().some(n => !n.seen)) return 'notice';

    // 5. All_clear: every source ok+fresh, lapse running, no unconfirmed emergencies, no notices.
    return 'all_clear';
  });

  // ── View-model computeds ───────────────────────────────────────────────────

  readonly overviewVm = computed<OverviewVM>(() => {
    const headline = this.compositeStatus();
    const patient = this.patientFacade.items()[0] ?? null;
    const monitoring = this.alarmFacade.monitoringVm();
    const lapse = this.lapseAdapter.lapseState();
    const sources = {
      hist: this.histHealth(),
      evnt: this.evntHealth(),
      edge: this.edgeHealth(),
      pat: this.patHealth(),
    };

    let degradedReason: string | null = null;
    if (headline === 'degraded' || headline === 'notice') {
      if (lapse === 'unknown') {
        degradedReason =
          'Detection-lapse state unknown — cannot confirm device is detecting. ' +
          'Will resolve when EVNT FE-EVNT-027/028 ships (INT-FE-DASH-001).';
      } else if (lapse === 'lapsed') {
        degradedReason = 'Edge device is online but not detecting.';
      } else {
        const degradedKeys = (Object.entries(sources) as [string, SourceHealth][])
          .filter(([, h]) => h !== 'ok')
          .map(([k]) => k);
        if (degradedKeys.length > 0) {
          degradedReason = `Cannot confirm — source(s) unavailable: ${degradedKeys.join(', ')}.`;
        }
      }
    }

    return {
      patientName: patient?.name ?? null,
      headline,
      lastCheckAt: monitoring.lastPolledAt,
      sources,
      degradedReason,
    };
  });

  /** KPI view-model. null values MUST render as "—" in the template, never 0 (INV-4). */
  readonly kpiVm = computed<KpiVM>(() => {
    const histOk = this.histHealth() === 'ok';
    const summary = this.histIntegration.historySummary();
    if (!histOk || !summary) {
      return { eventsToday: null, confirmedToday: null, pendingToday: null };
    }
    const eventsToday = summary.eventsInPeriod;
    const confirmedToday = summary.confirmed;
    return {
      eventsToday,
      confirmedToday,
      pendingToday: eventsToday - confirmedToday,
    };
  });

  /** Catalog summary: null items when PAT not ok — component renders error/loading state. */
  readonly catalogSummaryVm = computed<CatalogSummaryVM>(() => {
    const ph = this.patHealth();
    if (ph === 'loading') return { items: null, loading: true };
    if (ph !== 'ok') return { items: null, loading: false };
    return {
      items: this.commandFacade.items().map(c => ({
        label: c.label,
        urgency: c.urgency as 'emergency' | 'routine',
      })),
      loading: false,
    };
  });

  /** Active patient from PAT (null when no patient or PAT not ok). */
  readonly patient = computed(() => this.patientFacade.items()[0] ?? null);

  /** Edge device VM for panel rendering (from EDGE DeviceFacade). */
  readonly device = computed(() => this.deviceFacade.device());

  /**
   * Inline advisory suggestion — deterministic heuristic over recent HIST entries.
   * Never LLM-driven; Confirm/Ignore logged, never self-executing (INV-5).
   * Hidden behind `dash.suggestion.enabled` flag (always enabled in this scaffold).
   * Returns null when HIST not ok, or when dismissed, or when no pattern detected.
   */
  readonly suggestionVm = computed<SuggestionVM | null>(() => {
    if (this._suggestionDismissed()) return null;
    if (this.histHealth() !== 'ok') return null;
    const entries = this.histIntegration.historyEntries();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1_000;
    const refTime = Date.now();

    // Count commands by label over the last 7 days.
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (
        e.kind === 'event' &&
        e.commandLabel &&
        refTime - new Date(e.occurredAt).getTime() <= sevenDaysMs
      ) {
        counts.set(e.commandLabel, (counts.get(e.commandLabel) ?? 0) + 1);
      }
    }

    for (const [label, count] of counts) {
      if (count >= 3) {
        return {
          kind: 'advisory',
          text: `The "${label}" command was triggered ${count} times this week. Consider reviewing its sensitivity in Calibration.`,
        };
      }
    }
    return null;
  });

  /** Dismiss the advisory suggestion (Confirm or Ignore — both log the interaction). */
  dismissSuggestion(): void {
    this._suggestionDismissed.set(true);
    // TODO[fe-autopilot]: record the decision (confirm/ignore) in the audit trail — advisory never executes on its own.
  }
}
