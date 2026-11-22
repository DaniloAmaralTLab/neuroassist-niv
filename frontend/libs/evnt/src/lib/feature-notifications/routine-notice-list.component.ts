import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { AlarmFacade, RoutineNoticeVM } from '../alarm.facade';

function hour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * RoutineNoticeListComponent — smart, embedded in the Home notice slot (SPEC-02 §2).
 * Routine notices are discreet, non-blocking cards — NEVER a full-screen takeover.
 * Dismissal is feature-local (seen flag), not a data cache (SPEC-04 §3).
 */
@Component({
  selector: 'evnt-routine-notice-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (unseenNotices().length > 0) {
      <div class="flex flex-col gap-2">
        <h3 class="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-faint">
          Routine notices
        </h3>
        @for (notice of unseenNotices(); track notice.eventId) {
          <div
            class="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm"
          >
            <div class="flex items-start gap-2">
              <span
                class="material-symbols-outlined mt-0.5 text-[18px] text-info"
                aria-hidden="true"
              >notifications</span>
              <div>
                <p class="font-medium text-ink">
                  "{{ notice.commandLabel }}" requested
                </p>
                <p class="text-xs text-ink-faint">at {{ hour(notice.requestedAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (notice.canRecordFeedback && notice.feedback === 'not_evaluated') {
                <button
                  (click)="markNotReal(notice)"
                  class="text-xs font-medium text-ink-soft hover:text-ink"
                  [attr.aria-label]="'Mark as not real: ' + notice.commandLabel"
                >Not real</button>
              }
              <button
                (click)="dismiss(notice.eventId)"
                class="rounded-lg bg-surface-3 px-3 py-1 text-xs font-semibold text-ink hover:bg-surface-4"
                [attr.aria-label]="'Dismiss: ' + notice.commandLabel"
              >Dismiss</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class RoutineNoticeListComponent {
  protected readonly facade = inject(AlarmFacade);
  protected readonly hour = hour;

  readonly unseenNotices = computed<RoutineNoticeVM[]>(() =>
    this.facade.routineNoticesVm().filter(n => !n.seen),
  );

  protected dismiss(eventId: string): void {
    this.facade.dismissRoutineNotice(eventId);
  }

  protected markNotReal(notice: RoutineNoticeVM): void {
    this.facade.recordFeedback(notice.eventId, 'false_positive');
    this.facade.dismissRoutineNotice(notice.eventId);
  }
}
