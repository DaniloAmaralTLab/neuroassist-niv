import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientsFacade, EventsFacade, DevicesFacade, CommandsFacade } from '../../core/data-access';
import { now } from '../../shared/clock';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { DsKpiComponent } from '../../ui/ds-kpi.component';
import { DsBadgeComponent } from '../../ui/ds-badge.component';

// Contract: .build-plans/home.plan.md  (the implementer reads ONLY the build-plan)
// Wireframe ref: §5.1–5.5 — Home
// Goal: answer, within 2 seconds of reading, "Is Márcio OK?" (Principle 2.1).
// (Amendment 1) shows which catalog command was triggered, not just a binary state.
// Inline AI: no side panel (wireframe §3.1) — the advisory suggestion appears as a card
// inside the screen itself, with Confirm/Ignore, and never executes on its own.

function hour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function dateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${mm}/${dd} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DsCardComponent, DsButtonComponent, DsKpiComponent, DsBadgeComponent],
  template: `
    <div class="mx-auto max-w-6xl p-8">
      @if (loading()) {
        <div class="flex min-h-[50vh] items-center justify-center text-sm text-ink-faint">Loading status…</div>
      } @else if (!patient()) {
        <app-ds-card>
          <p class="text-sm text-ink-soft">No patient configured yet.</p>
          <a routerLink="/onboarding" class="mt-3 inline-block text-sm font-semibold text-brand">Start setup →</a>
        </app-ds-card>
      } @else {
        <header class="mb-7 flex items-center justify-between">
          <div>
            <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Hello, Jamilly</h1>
            <p class="mt-1 text-sm text-ink-soft">This is {{ patient()!.name }}'s status right now.</p>
          </div>
          @if (device(); as dev) {
            <span class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  [class]="dev.status === 'online' ? 'bg-success-bg text-success-ink' : 'bg-danger-bg text-danger-ink'">
              <span class="material-symbols-outlined text-[16px]">{{ dev.status === 'online' ? 'wifi' : 'wifi_off' }}</span>
              Device {{ dev.status === 'online' ? 'online' : 'offline' }}
            </span>
          }
        </header>

        @if (suggestion(); as s) {
          <app-ds-card class="mb-6 block !bg-ai-bg">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined mt-0.5 text-[20px] text-ai">auto_awesome</span>
              <div class="flex-1">
                <p class="text-sm font-semibold text-ai">Suggestion</p>
                <p class="mt-1 text-sm text-ink-soft">{{ s }}</p>
                <div class="mt-3 flex gap-2">
                  <button (click)="dismissSuggestion()" class="rounded-lg bg-ai-fill px-3 py-1.5 text-xs font-semibold text-ai-on">Confirm</button>
                  <button (click)="dismissSuggestion()" class="rounded-lg border-[1.5px] border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-2">Ignore</button>
                </div>
              </div>
            </div>
          </app-ds-card>
        }

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <!-- Main column: StatusCard + the day's KPIs -->
          <div class="flex flex-col gap-6">
            <app-ds-card variant="elevated">
              <div class="flex items-center gap-6 py-4">
                @if (estaBem()) {
                  <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-success-bg">
                    <span class="material-symbols-outlined text-[56px] text-success">check_circle</span>
                  </div>
                  <div>
                    <h2 class="font-display text-3xl font-bold text-ink">{{ patient()!.name.split(' ')[0] }} is OK</h2>
                    <p class="mt-2 text-sm text-ink-soft">
                      Last check: {{ lastHour() }}
                      @if (device(); as dev) {
                        <span class="text-ink-faint"> · synced {{ relativeSync(dev.lastSyncAt) }}</span>
                      }
                    </p>
                  </div>
                } @else if (lastEmergencyPending()) {
                  <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-warning-bg">
                    <span class="material-symbols-outlined text-[56px] text-warning">error</span>
                  </div>
                  <div>
                    <h2 class="font-display text-3xl font-bold text-ink">Event awaiting confirmation</h2>
                    <p class="mt-2 text-sm text-ink-soft">Last check: {{ lastHour() }}</p>
                  </div>
                } @else {
                  <div class="grid size-24 flex-shrink-0 place-items-center rounded-full bg-info-bg">
                    <span class="material-symbols-outlined text-[56px] text-info">notifications</span>
                  </div>
                  <div>
                    <h2 class="font-display text-3xl font-bold text-ink">
                      {{ patient()!.name.split(' ')[0] }} asked for "{{ lastCommandLabel() }}"
                    </h2>
                    <p class="mt-2 text-sm text-ink-soft">Last check: {{ lastHour() }}</p>
                  </div>
                }
              </div>
            </app-ds-card>

            <div class="grid grid-cols-2 gap-4">
              <app-ds-kpi label="Events today" [value]="eventsOfToday().length" kind="tint" />
              <app-ds-kpi label="Confirmed" [value]="confirmedToday()" kind="tint" [supportTone]="confirmedTone()" [delta]="confirmedDelta()" />
            </div>

            <a routerLink="/history" class="self-start">
              <app-ds-button variant="secondary">
                <span class="material-symbols-outlined text-[18px]">history</span>
                View today's history
              </app-ds-button>
            </a>
          </div>

          <!-- Side column: device + catalog -->
          <div class="flex flex-col gap-6">
            @if (device(); as dev) {
              <app-ds-card>
                <h3 class="mb-3 font-display text-sm font-semibold text-ink">Edge device</h3>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-ink-soft">Status</span>
                  <app-ds-badge [tone]="dev.status === 'online' ? 'ok' : 'er'">{{ dev.status }}</app-ds-badge>
                </div>
                <div class="mt-2.5 flex items-center justify-between text-sm">
                  <span class="text-ink-soft">Version</span>
                  <span class="text-ink">{{ dev.version }}</span>
                </div>
                <div class="mt-2.5 flex items-center justify-between text-sm">
                  <span class="text-ink-soft">Synced</span>
                  <span class="text-ink">{{ relativeSync(dev.lastSyncAt) }}</span>
                </div>
              </app-ds-card>
            }

            <app-ds-card>
              <h3 class="mb-3 font-display text-sm font-semibold text-ink">Command catalog</h3>
              <div class="flex flex-col gap-2">
                @for (c of commands(); track c.id) {
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-ink-soft">"{{ c.label }}"</span>
                    <app-ds-badge [tone]="c.urgency === 'emergency' ? 'er' : 'nf'">{{ c.urgency }}</app-ds-badge>
                  </div>
                }
              </div>
              <a routerLink="/calibration" class="mt-3 inline-block text-xs font-semibold text-brand hover:text-brand-strong">Manage catalog →</a>
            </app-ds-card>
          </div>
        </div>

        <!-- Recent events preview -->
        <app-ds-card class="mt-6 block">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="font-display text-sm font-semibold text-ink">Recent events</h3>
            <a routerLink="/history" class="text-xs font-semibold text-brand hover:text-brand-strong">View all →</a>
          </div>
          @if (eventsRecent().length === 0) {
            <p class="text-sm text-ink-soft">No events recorded yet.</p>
          } @else {
            <div class="flex flex-col divide-y divide-line">
              @for (evt of eventsRecent(); track evt.id) {
                <div class="flex items-center justify-between py-2.5 text-sm">
                  <span class="text-ink-soft">
                    "{{ labelOfCommand(evt.command) }}"
                    <span class="text-ink-faint">— {{ dateTime(evt.timestamp) }}</span>
                  </span>
                  @if (evt.confirmedAt) {
                    <app-ds-badge tone="ok">✓ confirmed</app-ds-badge>
                  } @else {
                    <app-ds-badge tone="wn">pending</app-ds-badge>
                  }
                </div>
              }
            </div>
          }
        </app-ds-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly patientsFacade = inject(PatientsFacade);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly devicesFacade = inject(DevicesFacade);
  private readonly commandsFacade = inject(CommandsFacade);

  protected readonly dateTime = dateTime;

  readonly loading = computed(() => this.patientsFacade.loading() || this.eventsFacade.loading() || this.devicesFacade.loading() || this.commandsFacade.loading());
  readonly patient = computed(() => this.patientsFacade.items()[0] ?? null);
  readonly device = computed(() => this.devicesFacade.items().find(d => d.id === this.patient()?.device) ?? null);
  readonly commands = computed(() => this.commandsFacade.items());

  protected labelOfCommand(commandId: string): string {
    return this.commands().find(c => c.id === commandId)?.label ?? commandId;
  }
  private urgencyOfCommand(commandId: string): 'emergency' | 'routine' | undefined {
    return this.commands().find(c => c.id === commandId)?.urgency;
  }

  readonly eventsOfToday = computed(() => {
    const p = this.patient();
    if (!p) return [];
    const today = now().toISOString().slice(0, 10);
    return this.eventsFacade.items()
      .filter(e => e.patientId === p.id && e.timestamp.slice(0, 10) === today)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  });

  readonly confirmedToday = computed(() => this.eventsOfToday().filter(e => e.confirmedAt != null).length);

  readonly confirmedDelta = computed(() => {
    const total = this.eventsOfToday().length;
    if (total === 0) return null;
    const pending = total - this.confirmedToday();
    return pending === 0 ? 'all reviewed' : `${pending} pending`;
  });
  readonly confirmedTone = computed<'up' | 'warn' | 'flat'>(() =>
    this.eventsOfToday().length > 0 && this.confirmedToday() === this.eventsOfToday().length ? 'up' : 'warn',
  );

  readonly eventsRecent = computed(() => {
    const p = this.patient();
    if (!p) return [];
    return this.eventsFacade.items()
      .filter(e => e.patientId === p.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 4);
  });

  readonly estaBem = computed(() => this.eventsOfToday().every(e => e.confirmedAt != null));

  /** Emergency without confirmation — should not happen (Screen 02 takes over the screen first),
   * but serves as a guard in case the caregiver reaches Home before the redirect. */
  readonly lastEmergencyPending = computed(() =>
    this.eventsOfToday().find(e => !e.confirmedAt && this.urgencyOfCommand(e.command) === 'emergency') ?? null,
  );

  readonly lastCommandLabel = computed(() => {
    const last = this.eventsOfToday()[0];
    return last ? this.labelOfCommand(last.command) : '';
  });

  readonly lastHour = computed(() => {
    const last = this.eventsOfToday()[0];
    return last ? hour(last.confirmedAt ?? last.timestamp) : '—';
  });

  protected relativeSync(iso: string): string {
    const diffMin = Math.round((now().getTime() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    return `${Math.round(diffMin / 60)}h ago`;
  }

  // Inline AI (advisory) — no side panel (wireframe §3.1): card on Home itself.
  private readonly suggestionDismissed = signal(false);
  readonly suggestion = computed(() => {
    if (this.suggestionDismissed()) return null;
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    const reference = now().getTime();
    const eventsWaterWeek = this.eventsFacade.items()
      .filter(e => e.command === 'cmd-water' && reference - new Date(e.timestamp).getTime() <= seteDiasMs);
    if (eventsWaterWeek.length >= 3) {
      return 'The "Water" command was triggered several times this week. Consider reviewing its sensitivity in Calibration.';
    }
    return null;
  });
  protected dismissSuggestion(): void {
    this.suggestionDismissed.set(true);
    // TODO[fe-autopilot]: record the decision (confirm/ignore) in the audit trail — advisory never executes on its own
  }
}
