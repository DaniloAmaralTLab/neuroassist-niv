import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { EventsFacade, CommandsFacade, PatientsFacade } from '../../core/data-access';
import { now } from '../../shared/clock';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsBadgeComponent } from '../../ui/ds-badge.component';
import { DsKpiComponent } from '../../ui/ds-kpi.component';

// Contract: .build-plans/history.plan.md  (the implementer reads ONLY the build-plan)
// Wireframe ref: §5.1–5.5 — History
// Goal: review the day's/week's/month's events in human language (Principle 2.5) and
// record false-positive/negative feedback (flow 4.7). (Amendment 1) shows the command's
// free-text label (e.g. "Water", "Frog") + urgency badge, not a fixed gesture text.

type Periodo = 'today' | 'week' | 'mes';
const PERIODO_LABEL: Record<Periodo, string> = { today: 'Today', week: 'Week', mes: 'Month' };
const PERIODO_DIAS: Record<Periodo, number> = { today: 1, week: 7, mes: 30 };

function dateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${mm}/${dd} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function hour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DsCardComponent, DsBadgeComponent, DsKpiComponent],
  template: `
    <div class="mx-auto max-w-6xl p-8">
      <header class="mb-7 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">History</h1>
          <p class="mt-1 text-sm text-ink-soft">Events recorded by Márcio Amaral's device.</p>
        </div>
        <div class="inline-flex rounded-xl bg-surface-2 p-1">
          @for (p of periodos; track p) {
            <button
              (click)="periodo.set(p)"
              class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
              [class]="periodo() === p ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'">
              {{ periodoLabel[p] }}
            </button>
          }
        </div>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <!-- Main column: event list -->
        <div>
          @if (loading()) {
            <p class="text-sm text-ink-faint">Loading events…</p>
          } @else if (eventsFiltered().length === 0) {
            <app-ds-card>
              <p class="text-center text-sm text-ink-soft">No events in this period.</p>
            </app-ds-card>
          } @else {
            <div class="flex flex-col gap-3">
              @for (evt of eventsFiltered(); track evt.id) {
                <app-ds-card>
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-sm font-semibold text-ink">
                        "{{ labelOfCommand(evt.command) }}"
                        <app-ds-badge [tone]="urgencyOfCommand(evt.command) === 'emergency' ? 'er' : 'nf'">{{ urgencyOfCommand(evt.command) }}</app-ds-badge>
                        <span class="font-normal text-ink-faint">— {{ dateTime(evt.timestamp) }}</span>
                      </p>
                      @if (evt.confirmedAt) {
                        <p class="mt-1 text-xs text-ink-soft">You confirmed at {{ hour(evt.confirmedAt) }}</p>
                      } @else {
                        <p class="mt-1 text-xs text-warning-ink">Not yet confirmed</p>
                      }
                    </div>

                    @if (evt.feedback === 'not_evaluated') {
                      <button
                        (click)="marcar(evt.id, 'real')"
                        class="flex-shrink-0 rounded-lg border-[1.5px] border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-2">
                        Was it real?
                      </button>
                    } @else if (evt.feedback === 'real') {
                      <app-ds-badge tone="ok">✓ Marked real</app-ds-badge>
                    } @else {
                      <app-ds-badge tone="mu">False positive</app-ds-badge>
                    }
                  </div>
                </app-ds-card>
              }
            </div>
          }
        </div>

        <!-- Side column: period summary -->
        <div class="flex flex-col gap-6">
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <app-ds-kpi label="Events in period" [value]="eventsFiltered().length" kind="tint" />
            <app-ds-kpi label="Confirmed" [value]="confirmed()" kind="tint" [supportTone]="confirmedTone()" />
          </div>
          <app-ds-card>
            <h3 class="mb-3 font-display text-sm font-semibold text-ink">Feedback</h3>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-soft">Marked real</span>
              <span class="font-semibold text-ink">{{ marcadosReais() }}</span>
            </div>
            <div class="mt-2.5 flex items-center justify-between text-sm">
              <span class="text-ink-soft">False positives</span>
              <span class="font-semibold text-ink">{{ falsosPositivos() }}</span>
            </div>
            <div class="mt-2.5 flex items-center justify-between text-sm">
              <span class="text-ink-soft">Not yet reviewed</span>
              <span class="font-semibold text-ink">{{ notEvaluated() }}</span>
            </div>
          </app-ds-card>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  private readonly facade = inject(EventsFacade);
  private readonly commandsFacade = inject(CommandsFacade);
  private readonly patientsFacade = inject(PatientsFacade);
  protected readonly dateTime = dateTime;
  protected readonly hour = hour;
  protected readonly periodos: Periodo[] = ['today', 'week', 'mes'];
  protected readonly periodoLabel = PERIODO_LABEL;

  readonly loading = computed(() => this.facade.loading() || this.patientsFacade.loading() || this.commandsFacade.loading());
  readonly periodo = signal<Periodo>('week');

  protected labelOfCommand(commandId: string): string {
    return this.commandsFacade.items().find(c => c.id === commandId)?.label ?? commandId;
  }
  protected urgencyOfCommand(commandId: string): 'emergency' | 'routine' | undefined {
    return this.commandsFacade.items().find(c => c.id === commandId)?.urgency;
  }

  readonly eventsFiltered = computed(() => {
    const p = this.patientsFacade.items()[0];
    if (!p) return [];
    const limiteMs = PERIODO_DIAS[this.periodo()] * 24 * 60 * 60 * 1000;
    const reference = now().getTime();
    return this.facade.items()
      .filter(e => e.patientId === p.id && reference - new Date(e.timestamp).getTime() <= limiteMs)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  });

  readonly confirmed = computed(() => this.eventsFiltered().filter(e => e.confirmedAt != null).length);
  readonly confirmedTone = computed<'up' | 'warn' | 'flat'>(() =>
    this.eventsFiltered().length > 0 && this.confirmed() === this.eventsFiltered().length ? 'up' : 'warn',
  );
  readonly marcadosReais = computed(() => this.eventsFiltered().filter(e => e.feedback === 'real').length);
  readonly falsosPositivos = computed(() => this.eventsFiltered().filter(e => e.feedback === 'false_positive').length);
  readonly notEvaluated = computed(() => this.eventsFiltered().filter(e => e.feedback === 'not_evaluated').length);

  protected marcar(id: string, feedback: 'real' | 'false_positive'): void {
    this.facade.items.update(list => list.map(e => (e.id === id ? { ...e, feedback } : e)));
  }
}
