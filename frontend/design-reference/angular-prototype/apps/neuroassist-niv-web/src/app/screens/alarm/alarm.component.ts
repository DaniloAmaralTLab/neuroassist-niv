import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { EventsFacade, CommandsFacade, CaregiversFacade } from '../../core/data-access';
import { nowIso } from '../../shared/clock';

// Contract: .build-plans/alarm.plan.md  (the implementer reads ONLY the build-plan)
// Wireframe ref: §5.1–5.5 — Alarm — the product's mother flow (4.2)
// Goal: be absolutely unmistakable (Principle 2.2) and require explicit human confirmation
// before returning to normal (Principle 2.3). (Amendment 1) Exclusive to commands
// with urgency=emergency — routine commands never reach here (see toast §3.2.E).
// Reads the same Event[] collection as Home/History (EventsFacade) — there is no longer a
// separate "active_event" collection. "Active event" = the most recent one with urgency
// emergency and WITHOUT confirmedAt (not just "the most recent", which could be an
// alarm resolved days ago — see wireframe §5.5: this screen only exists when there is a
// truly active event).

function hour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-alarm',
  standalone: true,
  template: `
    @if (eventPending(); as evt) {
      <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-alarm px-8 text-center">
        <span class="material-symbols-outlined text-[96px] text-alarm-ink">emergency_home</span>
        <h1 class="mt-6 font-display text-4xl font-extrabold tracking-tight text-alarm-ink">
          {{ patientName }} needs help
        </h1>
        <p class="mt-3 text-lg font-semibold text-alarm-ink/90">"{{ label(evt.command) }}"</p>
        <p class="mt-2 text-base font-medium text-alarm-ink/80">
          Gesture detected at {{ hour(evt.timestamp) }}
        </p>
        <button
          (click)="confirm(evt.id)"
          class="mt-12 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-alarm shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <span class="material-symbols-outlined text-[22px]">check</span>
          Confirm I attended to {{ patientName.split(' ')[0] }}
        </button>
      </div>
    } @else if (newlyConfirmed(); as evt) {
      <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-8 text-center">
        <span class="material-symbols-outlined text-[64px] text-success">check_circle</span>
        <h1 class="mt-5 font-display text-2xl font-bold text-ink">Attendance confirmed</h1>
        <p class="mt-2 text-sm text-ink-soft">
          {{ patientName }} was attended to at {{ hour(evt.confirmedAt!) }} by {{ nameOfCaregiver(evt.confirmedBy) }}.
        </p>
      </div>
    } @else {
      <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-8 text-center">
        <span class="material-symbols-outlined text-[64px] text-ink-faint">notifications_off</span>
        <p class="mt-4 text-sm text-ink-soft">No active emergency alarm right now.</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlarmComponent {
  private readonly facade = inject(EventsFacade);
  private readonly commandsFacade = inject(CommandsFacade);
  private readonly caregiversFacade = inject(CaregiversFacade);
  protected readonly hour = hour;
  protected readonly patientName = 'Márcio Amaral';

  /** Id of the event confirmed in this session — only exists to give immediate feedback after
   * clicking "Confirm"; it does not persist as screen state on a new visit. */
  private readonly confirmedInThisSessionId = signal<string | null>(null);

  private readonly emergencies = computed(() =>
    this.facade.items()
      .filter(e => this.commandsFacade.items().find(c => c.id === e.command)?.urgency === 'emergency')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  );

  /** Truly active event: the most recent one still WITHOUT confirmedAt. An already
   * resolved alarm (even if it is the most recent by timestamp) never appears here. */
  readonly eventPending = computed(() => this.emergencies().find(e => !e.confirmedAt) ?? null);

  readonly newlyConfirmed = computed(() => {
    const id = this.confirmedInThisSessionId();
    if (!id) return null;
    return this.facade.items().find(e => e.id === id && e.confirmedAt != null) ?? null;
  });

  protected label(commandId: string): string {
    return this.commandsFacade.items().find(c => c.id === commandId)?.label ?? '';
  }

  /** Event.confirmedBy holds the Caregiver id (same convention as the historical mock,
   * e.g. 'cg-jamilly') — resolves to the display name. */
  protected nameOfCaregiver(id: string): string {
    return this.caregiversFacade.items().find(c => c.id === id)?.name ?? 'you';
  }

  protected confirm(id: string): void {
    const now = nowIso();
    const caregiver = this.caregiversFacade.items()[0]?.id ?? '';
    this.facade.items.update(list =>
      list.map(e => (e.id === id ? { ...e, confirmedAt: now, confirmedBy: caregiver, feedback: 'real' as const } : e)),
    );
    this.confirmedInThisSessionId.set(id);
    // TODO[fe-autopilot]: record the confirmation in the audit trail (the product's mother flow)
  }
}
