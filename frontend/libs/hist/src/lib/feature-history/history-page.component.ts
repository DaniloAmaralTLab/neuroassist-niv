import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  DsCardComponent,
  DsBadgeComponent,
  DsKpiComponent,
} from '@neuroassist/shared/ui-components';
import { HistoryFacade, HistoryEntryVM, PeriodFilter } from '../hist.facade';

// Promoted from: design-reference/angular-prototype/apps/neuroassist-niv-web/src/app/screens/history/history.component.ts
// Wireframe ref: §5.1–5.5 — History
// Build-plan: design-reference/angular-prototype/.build-plans/history.plan.md
// Connected to HistoryFacade via HISTORY_PORT (P4).
// Mock data removed; prototype facades replaced by HistoryFacade/Port/Adapter layer.
//
// SAFETY:
//  - Entry kinds event | escalation | detection-lapse: safety surfaces use informational styling
//    (class bg-info-bg / text-info-ink), NEVER --color-alarm (never bg-alarm or text-alarm-ink).
//  - maskedTarget shown verbatim — NEVER unmask (BE masks server-side, doc 01 §6).
//  - NEVER render "no entries" when the read failed (error/degraded state instead, SPEC-07 §2).
//  - Feedback write DELEGATED to EVNT via (markFeedback) output — HIST owns no write (ADR-005).

const PERIODO_LABEL: Record<PeriodFilter, string> = {
  today: 'Today',
  week: 'Week',
  month: 'Month',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'hist-history-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DsCardComponent, DsBadgeComponent, DsKpiComponent],
  template: `
    <div class="mx-auto max-w-6xl p-8">
      <header class="mb-7 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">History</h1>
          <p class="mt-1 text-sm text-ink-soft">Events recorded by the monitored patient's device.</p>
        </div>
        <!-- Period filter tabs -->
        <div class="inline-flex rounded-xl bg-surface-2 p-1">
          @for (p of periodos; track p) {
            <button
              (click)="selectPeriod(p)"
              class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
              [class]="facade.period() === p ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'">
              {{ periodoLabel[p] }}
            </button>
          }
        </div>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <!-- Main column: event timeline -->
        <div>
          @switch (facade.state()) {

            @case ('loading') {
              <!-- Loading skeleton — reserved rows (SPEC-03 EARS: never show empty state while loading) -->
              <div class="flex flex-col gap-3" aria-busy="true" aria-label="Loading history…">
                @for (n of [0, 1, 2]; track n) {
                  <app-ds-card>
                    <div class="h-5 w-2/3 animate-pulse rounded bg-surface-2"></div>
                    <div class="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface-2"></div>
                  </app-ds-card>
                }
              </div>
            }

            @case ('error') {
              <!-- Error / degraded state — NEVER render false "no events" here (SPEC-07 §2 / task constraint) -->
              <app-ds-card>
                <div class="flex items-center gap-3 text-sm">
                  <span class="material-symbols-outlined text-[20px] text-warning-ink" aria-hidden="true">cloud_off</span>
                  <span class="text-ink-soft">History is temporarily unavailable. Please try again.</span>
                </div>
                <button
                  (click)="facade.refresh()"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-2">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                  Retry
                </button>
              </app-ds-card>
            }

            @case ('empty') {
              <!-- Empty state — only shown when the READ SUCCEEDED and returned zero entries -->
              <app-ds-card>
                <p class="text-center text-sm text-ink-soft">No events in this period.</p>
              </app-ds-card>
            }

            @default {
              <!-- list state -->
              <div class="flex flex-col gap-3">
                @for (entry of facade.entries(); track entry.id) {

                  @if (entry.isSafetySurface) {
                    <!-- SAFETY SURFACE: escalation | detection-lapse
                         Informational styling (bg-info-bg / text-info-ink) — NEVER --color-alarm -->
                    <app-ds-card>
                      <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined mt-0.5 text-[18px] text-info-ink" aria-hidden="true">
                          {{ entry.kind === 'escalation' ? 'escalation' : 'sensors_off' }}
                        </span>
                        <div class="flex-1">
                          <p class="text-sm font-semibold text-ink">{{ entry.title }}</p>
                          <p class="mt-0.5 text-xs text-ink-soft">{{ entry.detail }}</p>
                          @if (entry.kind === 'escalation' && entry.channel) {
                            <p class="mt-1 text-xs text-ink-faint">
                              Channel: {{ entry.channel }}
                              @if (entry.maskedTarget) {
                                · {{ entry.maskedTarget }}
                              }
                            </p>
                          }
                          @if (entry.lapseState) {
                            <app-ds-badge tone="nf">{{ entry.lapseState }}</app-ds-badge>
                          }
                          <p class="mt-1 text-xs text-ink-faint">{{ formatDateTime(entry.occurredAt) }}</p>
                        </div>
                      </div>
                    </app-ds-card>
                  } @else {
                    <!-- Standard event / confirmation / feedback row -->
                    <app-ds-card>
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <p class="text-sm font-semibold text-ink">
                            @if (entry.commandLabel) {
                              "{{ entry.commandLabel }}"
                            } @else {
                              {{ entry.title }}
                            }
                            @if (entry.urgency) {
                              <app-ds-badge [tone]="entry.urgency === 'emergency' ? 'er' : 'nf'">
                                {{ entry.urgency }}
                              </app-ds-badge>
                            }
                            <span class="font-normal text-ink-faint">— {{ formatDateTime(entry.occurredAt) }}</span>
                          </p>
                          @if (entry.kind === 'event') {
                            @if (entry.confirmation === 'confirmed' && entry.confirmedAt) {
                              <p class="mt-1 text-xs text-ink-soft">You confirmed at {{ formatHour(entry.confirmedAt) }}</p>
                            } @else if (entry.confirmation === 'not-yet-confirmed') {
                              <p class="mt-1 text-xs text-warning-ink">Not yet confirmed</p>
                            }
                          } @else {
                            <p class="mt-0.5 text-xs text-ink-soft">{{ entry.detail }}</p>
                          }
                        </div>

                        <!-- Feedback affordance (delegated to EVNT via shell — ADR-005, SPEC-04 §4) -->
                        @if (entry.kind === 'event' && entry.canRecordFeedback && entry.feedbackOutcome === 'not_evaluated') {
                          <button
                            (click)="onMarkFeedback(entry)"
                            class="flex-shrink-0 rounded-lg border-[1.5px] border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-2">
                            Was it real?
                          </button>
                        } @else if (entry.feedbackOutcome === 'real') {
                          <app-ds-badge tone="ok">Marked real</app-ds-badge>
                        } @else if (entry.feedbackOutcome === 'false_positive') {
                          <app-ds-badge tone="mu">False positive</app-ds-badge>
                        }
                      </div>
                    </app-ds-card>
                  }

                }

                <!-- Load more -->
                @if (facade.hasMore()) {
                  <button
                    (click)="facade.loadMore()"
                    class="mt-2 w-full rounded-xl border border-line-strong px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-2">
                    Load more
                  </button>
                }
              </div>
            }

          }
        </div>

        <!-- Side column: period summary -->
        <div class="flex flex-col gap-6">
          @if (facade.summary(); as s) {
            <div class="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <app-ds-kpi label="Events in period" [value]="s.eventsInPeriod" />
              <app-ds-kpi label="Confirmed" [value]="s.confirmed" />
            </div>
            <app-ds-card>
              <h3 class="mb-3 font-display text-sm font-semibold text-ink">Feedback</h3>
              <div class="flex items-center justify-between text-sm">
                <span class="text-ink-soft">Marked real</span>
                <span class="font-semibold text-ink">{{ s.markedReal }}</span>
              </div>
              <div class="mt-2.5 flex items-center justify-between text-sm">
                <span class="text-ink-soft">False positives</span>
                <span class="font-semibold text-ink">{{ s.falsePositives }}</span>
              </div>
              <div class="mt-2.5 flex items-center justify-between text-sm">
                <span class="text-ink-soft">Not yet reviewed</span>
                <span class="font-semibold text-ink">{{ s.notReviewed }}</span>
              </div>
              @if (s.scope === 'loaded') {
                <p class="mt-3 text-[10px] text-ink-faint">Counts reflect loaded entries, not the full period.</p>
              }
            </app-ds-card>
          } @else if (facade.state() === 'list') {
            <!-- Summary loading placeholder -->
            <div class="flex flex-col gap-3">
              <div class="h-16 animate-pulse rounded-xl bg-surface-2"></div>
              <div class="h-28 animate-pulse rounded-xl bg-surface-2"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class HistoryPageComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(HistoryFacade);
  protected readonly periodos: PeriodFilter[] = ['today', 'week', 'month'];
  protected readonly periodoLabel = PERIODO_LABEL;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatHour = formatHour;

  /**
   * Feedback affordance delegated to EVNT via shell (SPEC-04 §4, SPEC-06 §3).
   * HIST emits the event; the shell wires it to EVNT's feedback port.
   * On EVNT success: shell calls facade.refresh() — HIST never patches locally.
   * On EVNT failure: HIST does not re-read (SPEC-07 §2.3).
   */
  readonly markFeedback = output<{ eventId: string; verdict: 'real' | 'false_positive' }>();

  ngOnInit(): void {
    // Trigger initial load on navigation.
    // patientId is set by HistShellIntegrationService before this component mounts.
    // TODO[FE-HIST-002]: HistShellIntegrationService wires the active patientId before load().
    this.facade.load();
  }

  ngOnDestroy(): void {
    // No timer or service-worker to tear down (HIST does not poll — ADR-005, doc 05 §2).
  }

  protected selectPeriod(period: PeriodFilter): void {
    this.facade.setPeriod(period);
  }

  protected onMarkFeedback(entry: HistoryEntryVM): void {
    if (!entry.relatedEventId) return;
    // Emit upward — the shell routes this to EVNT (never to a HIST endpoint).
    this.markFeedback.emit({ eventId: entry.relatedEventId, verdict: 'real' });
  }
}
