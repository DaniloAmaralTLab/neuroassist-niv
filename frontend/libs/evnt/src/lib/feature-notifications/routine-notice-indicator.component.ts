import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * RoutineNoticeIndicatorComponent — presentational (topbar contribution).
 * Discreet count/affordance for routine notices (SPEC-02 §2, §3.2.E).
 * NEVER an emergency indicator — routine notices are discreet, never a full-screen takeover.
 */
@Component({
  selector: 'evnt-routine-notice-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="relative flex items-center gap-1 rounded-lg p-2 text-ink-soft transition hover:bg-surface-2 hover:text-ink"
      [class.text-brand]="hasUnseen()"
      [attr.aria-label]="hasUnseen() ? count() + ' unseen routine notices' : 'No new routine notices'"
    >
      <span class="material-symbols-outlined text-[22px]" aria-hidden="true">notifications</span>
      @if (count() > 0) {
        <span
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          {{ count() > 99 ? '99+' : count() }}
        </span>
      }
    </button>
  `,
})
export class RoutineNoticeIndicatorComponent {
  readonly count = input.required<number>();
  readonly hasUnseen = input.required<boolean>();
}
