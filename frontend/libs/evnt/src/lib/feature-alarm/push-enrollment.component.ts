import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { PushChannelFacade, PushChannelVM } from '../push-channel.facade';

/**
 * PushEnrollmentComponent — smart component, embedded in the escalation-status surface / settings slot.
 *
 * SAFETY (SPEC-04 §5.7):
 *  - Permission requested ONLY on an explicit caregiver gesture (enableRequested output).
 *  - NEVER on first paint, NEVER in a retry loop.
 *  - On denied: degrades VISIBLY (push off, SMS/voice still noted, instructions for site settings).
 *  - EscalationChannelStatusComponent renders the honest per-channel state.
 */
@Component({
  selector: 'evnt-push-enrollment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface-2 p-5">
      <div class="mb-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-ink-soft" aria-hidden="true">
          notifications_active
        </span>
        <h3 class="font-display text-sm font-semibold text-ink">Alarm escalation channels</h3>
      </div>

      <p class="mb-4 text-xs text-ink-soft">{{ facade.pushChannelVm().message }}</p>

      <div class="flex flex-col gap-3">
        <!-- Push channel (Tier 0) -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm">
            <span class="material-symbols-outlined text-[18px]" [class]="pushIconClass()" aria-hidden="true">
              notifications
            </span>
            <span class="text-ink">Browser push (Tier 0)</span>
          </div>
          @if (vm().pushEnrolled) {
            <span class="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-ink">On</span>
            @if (vm().canManage) {
              <button
                (click)="disable()"
                class="text-xs font-medium text-ink-soft underline hover:text-ink"
              >Turn off</button>
            }
          } @else if (vm().permission === 'denied') {
            <span class="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger-ink">Blocked</span>
            <button
              (click)="showDeniedHelp()"
              class="text-xs font-medium text-brand underline"
            >How to re-enable →</button>
          } @else if (vm().permission === 'unsupported') {
            <span class="text-xs text-ink-faint">Not supported</span>
          } @else {
            @if (vm().canManage) {
              <button
                (click)="enable()"
                [disabled]="facade.enrolling()"
                class="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
              >
                @if (facade.enrolling()) {
                  <span class="material-symbols-outlined animate-spin text-[14px]" aria-hidden="true">progress_activity</span>
                }
                Enable alarm notifications
              </button>
            } @else {
              <span class="text-xs text-ink-faint">Off</span>
            }
          }
        </div>

        <!-- SMS channel (Tier 1) — contact-missing WHILE INT-EVNT-ACS-001 is OPEN -->
        <div class="flex items-center justify-between gap-3 text-sm">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-ink-soft" aria-hidden="true">sms</span>
            <span class="text-ink">SMS (Tier 1, +30 s)</span>
          </div>
          @if (vm().sms === 'contact-missing') {
            <span class="text-xs text-ink-faint">Contact missing</span>
          } @else {
            <span class="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-ink">Armed</span>
          }
        </div>

        <!-- Voice channel (Tier 2) — contact-missing WHILE INT-EVNT-ACS-001 is OPEN -->
        <div class="flex items-center justify-between gap-3 text-sm">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-ink-soft" aria-hidden="true">call</span>
            <span class="text-ink">Voice call (Tier 2, +90 s)</span>
          </div>
          @if (vm().voice === 'contact-missing') {
            <span class="text-xs text-ink-faint">Contact missing</span>
          } @else {
            <span class="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-ink">Armed</span>
          }
        </div>
      </div>

      @if (vm().sms === 'contact-missing') {
        <p class="mt-3 text-xs text-ink-faint">
          Add a phone number in Access settings to arm SMS and voice (Tiers 1–2).
          <!-- INT-EVNT-ACS-001: waiting for ACS to expose caregiver phone -->
        </p>
      }

      @if (showDeniedInstructions()) {
        <div class="mt-3 rounded-lg bg-warning-bg px-4 py-3 text-xs text-warning-ink">
          To re-enable push: open your browser's Site Settings for this page → Notifications → Allow.
        </div>
      }
    </div>
  `,
})
export class PushEnrollmentComponent {
  protected readonly facade = inject(PushChannelFacade);
  readonly vm = this.facade.pushChannelVm;

  private _showDeniedInstructions = false;
  protected showDeniedInstructions(): boolean { return this._showDeniedInstructions; }

  protected pushIconClass(): string {
    switch (this.vm().permission) {
      case 'granted': return this.vm().pushEnrolled ? 'text-success' : 'text-ink-soft';
      case 'denied':  return 'text-danger-ink';
      default:        return 'text-ink-soft';
    }
  }

  /**
   * Enable push — explicit caregiver gesture ONLY (SPEC-04 §5.7).
   * NEVER called on first paint or in a retry loop.
   */
  protected enable(): void {
    this.facade.requestAndSubscribe();
  }

  protected disable(): void {
    this.facade.unsubscribe();
  }

  /** Show instructions for re-enabling a hard-denied permission (SPEC-04 §5.7). */
  protected showDeniedHelp(): void {
    this._showDeniedInstructions = true;
  }
}
