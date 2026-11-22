import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DsCardComponent,
  DsButtonComponent,
  DsKpiComponent,
  DsBadgeComponent,
} from '@neuroassist/shared/ui-components';
import { EdgeDeviceCardComponent } from '@neuroassist/edge';
import { RoutineNoticeListComponent } from '@neuroassist/evnt';
import { HistoryWidgetComponent } from '@neuroassist/hist';
import { DashboardFacade } from '../dash.facade';

// Promoted from: frontend/design-reference/angular-prototype/apps/neuroassist-niv-web/src/app/screens/home/home.component.ts
// Contract: docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02..SPEC-04
// Wireframe ref: §5.1–5.5 — Home — "Is my patient OK, and is the system really watching?"
//
// SAFETY CHANGES from prototype (ADR-002):
//  — Removed: PatientsFacade, EventsFacade, DevicesFacade, CommandsFacade (prototype-local facades).
//  — Replaced: DashboardFacade (composition facade — no HttpClient, no duplicate store).
//  — Fixed: `estaBem = events.every(confirmed)` true-on-empty bug →
//           now `overview.headline === 'all_clear'` (requires explicit positive server answer).
//  — Never style emergency: `emergency` state shows a "redirecting" notice; EVNT takeover owns the screen.
//  — Never suppress EVNT emergency takeover: the shell's alarm route pre-empts /home.
//  — Failed KPI renders "—" (from DsKpiComponent null input), never 0.
//  — Failed panel renders error state, never blank/clear (INV-4).
//  — Detection-lapse unknown → degraded, never all_clear (INT-FE-DASH-001).

@Component({
  selector: 'dash-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DsCardComponent,
    DsButtonComponent,
    DsKpiComponent,
    DsBadgeComponent,
    EdgeDeviceCardComponent,
    RoutineNoticeListComponent,
    HistoryWidgetComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl p-8">

      @let overview = facade.overviewVm();
      @let kpi = facade.kpiVm();
      @let catalog = facade.catalogSummaryVm();
      @let suggestion = facade.suggestionVm();

      @if (overview.headline === 'loading') {
        <!-- Loading state: at least one source still in first-load -->
        <div class="flex min-h-[50vh] items-center justify-center text-sm text-ink-faint">
          Loading status…
        </div>

      } @else if (!overview.patientName) {
        <!-- No patient configured yet -->
        <app-ds-card>
          <p class="text-sm text-ink-soft">No patient configured yet.</p>
          <a routerLink="/patients" class="mt-3 inline-block text-sm font-semibold text-brand">
            Set up patient →
          </a>
        </app-ds-card>

      } @else {
        <!-- Main caregiver overview -->
        <header class="mb-7 flex items-center justify-between">
          <div>
            <h1 class="font-display text-2xl font-bold tracking-tight text-ink">
              Hello, caregiver
            </h1>
            <p class="mt-1 text-sm text-ink-soft">
              This is {{ overview.patientName }}'s status right now.
            </p>
          </div>
          <!-- Device status badge (EDGE — inline in header, not re-derived by DASH) -->
          @if (facade.device(); as dev) {
            <span class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  [class]="dev.status === 'online' ? 'bg-success-bg text-success-ink' : 'bg-danger-bg text-danger-ink'">
              <span class="material-symbols-outlined text-[16px]">
                {{ dev.status === 'online' ? 'wifi' : 'wifi_off' }}
              </span>
              Device {{ dev.status === 'online' ? 'online' : 'offline' }}
            </span>
          }
        </header>

        <!-- Degraded / notice: reason banner -->
        @if (overview.degradedReason) {
          <div class="mb-4 rounded-lg border border-line bg-warning-bg px-4 py-3 text-sm text-warning-ink">
            <span class="material-symbols-outlined align-middle text-[16px]">info</span>
            {{ overview.degradedReason }}
          </div>
        }

        <!-- Advisory suggestion card (deterministic heuristic — SPEC-03 §6, never LLM) -->
        @if (suggestion) {
          <app-ds-card class="mb-6 block !bg-ai-bg">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined mt-0.5 text-[20px] text-ai">auto_awesome</span>
              <div class="flex-1">
                <p class="text-sm font-semibold text-ai">Suggestion</p>
                <p class="mt-1 text-sm text-ink-soft">{{ suggestion.text }}</p>
                <div class="mt-3 flex gap-2">
                  <button
                    (click)="facade.dismissSuggestion()"
                    class="rounded-lg bg-ai-fill px-3 py-1.5 text-xs font-semibold text-ai-on"
                  >Confirm</button>
                  <button
                    (click)="facade.dismissSuggestion()"
                    class="rounded-lg border-[1.5px] border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-2"
                  >Ignore</button>
                </div>
              </div>
            </div>
          </app-ds-card>
        }

        <!-- Routine notice list (EVNT-owned smart component — renders from AlarmFacade directly) -->
        <evnt-routine-notice-list class="mb-6 block" />

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <!-- Main column: composite status card + KPIs -->
          <div class="flex flex-col gap-6">

            <!-- Composite status headline (SPEC-03 §4, ADR-002) -->
            <app-ds-card variant="elevated">
              <div class="flex items-center gap-6 py-4">

                @switch (overview.headline) {

                  @case ('all_clear') {
                    <!-- all_clear: EVERY source ok+fresh+clear — the only green branch (INV-1) -->
                    <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-success-bg">
                      <span class="material-symbols-outlined text-[56px] text-success">check_circle</span>
                    </div>
                    <div>
                      <h2 class="font-display text-3xl font-bold text-ink">
                        {{ overview.patientName.split(' ')[0] }} is OK
                      </h2>
                      <p class="mt-2 text-sm text-ink-soft">
                        Last check:
                        @if (overview.lastCheckAt) {
                          {{ formatHour(overview.lastCheckAt) }}
                        } @else {
                          —
                        }
                      </p>
                    </div>
                  }

                  @case ('notice') {
                    <!-- notice: all sources ok, but detection-lapse open or routine notices present -->
                    <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-warning-bg">
                      <span class="material-symbols-outlined text-[56px] text-warning">notifications_active</span>
                    </div>
                    <div>
                      <h2 class="font-display text-3xl font-bold text-ink">
                        {{ overview.patientName.split(' ')[0] }}: notice
                      </h2>
                      <p class="mt-2 text-sm text-ink-soft">
                        @if (overview.degradedReason) {
                          {{ overview.degradedReason }}
                        } @else {
                          Routine notice — review the events below.
                        }
                      </p>
                    </div>
                  }

                  @case ('degraded') {
                    <!-- degraded: one or more sources not ok — cannot confirm status -->
                    <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-info-bg">
                      <span class="material-symbols-outlined text-[56px] text-info">help</span>
                    </div>
                    <div>
                      <h2 class="font-display text-3xl font-bold text-ink">
                        Cannot confirm status
                      </h2>
                      <p class="mt-2 text-sm text-ink-soft">
                        @if (overview.lastCheckAt) {
                          Last check: {{ formatHour(overview.lastCheckAt) }}
                        } @else {
                          Status data unavailable.
                        }
                      </p>
                    </div>
                  }

                  @case ('emergency') {
                    <!-- emergency: EVNT takeover is in charge — DASH never styles emergency itself (INV-3) -->
                    <!-- This branch should be pre-empted by the /alarm route in the shell -->
                    <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-info-bg">
                      <span class="material-symbols-outlined text-[56px] text-info">sensors</span>
                    </div>
                    <div>
                      <h2 class="font-display text-3xl font-bold text-ink">
                        Alert active
                      </h2>
                      <p class="mt-2 text-sm text-ink-soft">
                        The alarm screen should have opened automatically.
                      </p>
                      <a routerLink="/alarm"
                         class="mt-2 inline-block text-sm font-semibold text-brand hover:text-brand-strong">
                        Go to alarm →
                      </a>
                    </div>
                  }

                  @default {
                    <!-- loading or unknown: held state -->
                    <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-surface-2">
                      <span class="material-symbols-outlined text-[56px] text-ink-faint">hourglass_empty</span>
                    </div>
                    <div>
                      <h2 class="font-display text-3xl font-bold text-ink">Loading…</h2>
                      <p class="mt-2 text-sm text-ink-soft">Gathering status from all sources.</p>
                    </div>
                  }

                }
              </div>
            </app-ds-card>

            <!-- KPI row (INV-4: null = "—", NEVER 0) -->
            <div class="grid grid-cols-3 gap-4">
              <app-ds-kpi
                label="Events today"
                [value]="kpi.eventsToday !== null ? kpi.eventsToday : '—'"
              />
              <app-ds-kpi
                label="Confirmed"
                [value]="kpi.confirmedToday !== null ? kpi.confirmedToday : '—'"
              />
              <app-ds-kpi
                label="Pending"
                [value]="kpi.pendingToday !== null ? kpi.pendingToday : '—'"
              />
            </div>

            <a routerLink="/history" class="self-start">
              <app-ds-button variant="secondary">
                <span class="material-symbols-outlined text-[18px]">history</span>
                View today's history
              </app-ds-button>
            </a>
          </div>

          <!-- Side column: EDGE device card + command catalog summary -->
          <div class="flex flex-col gap-6">

            <!-- Edge device card (EDGE-owned component — DASH never re-derives connectivity) -->
            <edge-device-card [device]="facade.device()" />

            <!-- Command catalog summary (PAT-owned data — DASH renders, never re-fetches) -->
            <app-ds-card>
              <h3 class="mb-3 font-display text-sm font-semibold text-ink">Command catalog</h3>
              @if (catalog.loading) {
                <p class="text-xs text-ink-faint">Loading catalog…</p>
              } @else if (!catalog.items) {
                <p class="text-xs text-ink-faint">Catalog unavailable.</p>
              } @else if (catalog.items.length === 0) {
                <p class="text-xs text-ink-faint">No commands configured.</p>
              } @else {
                <div class="flex flex-col gap-2">
                  @for (c of catalog.items; track c.label) {
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-ink-soft">"{{ c.label }}"</span>
                      <app-ds-badge [tone]="c.urgency === 'emergency' ? 'er' : 'nf'">
                        {{ c.urgency }}
                      </app-ds-badge>
                    </div>
                  }
                </div>
              }
              <a routerLink="/patients/command-catalog"
                 class="mt-3 inline-block text-xs font-semibold text-brand hover:text-brand-strong">
                Manage catalog →
              </a>
            </app-ds-card>
          </div>
        </div>

        <!-- Recent events widget (HIST-owned smart component — read-only) -->
        <div class="mt-6">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="font-display text-sm font-semibold text-ink">Recent events</h3>
            <a routerLink="/history"
               class="text-xs font-semibold text-brand hover:text-brand-strong">View all →</a>
          </div>
          <hist-history-widget />
        </div>
      }
    </div>
  `,
})
export class HomeComponent {
  protected readonly facade = inject(DashboardFacade);

  protected formatHour(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
