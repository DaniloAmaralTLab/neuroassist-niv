import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MonitoringVM } from '../alarm.facade';

/**
 * MonitoringStatusBannerComponent — SAFETY-critical presentational.
 *
 * ALWAYS evaluated on the alarm surface (SPEC-02 §1, SPEC-04 §5).
 * Visible whenever monitoring is degraded (hidden / offline / stale).
 * NEVER silent, NEVER replaced by a false "all clear" (mandate: limitation is visible).
 * Does NOT affect the alarm VM — it is an informational surface only.
 */
@Component({
  selector: 'evnt-monitoring-status-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm().foregroundRequired) {
      <div
        role="alert"
        aria-live="assertive"
        class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium"
        [class]="bannerClass()">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">
          {{ bannerIcon() }}
        </span>
        <span>{{ vm().message }}</span>
      </div>
    }
  `,
})
export class MonitoringStatusBannerComponent {
  readonly vm = input.required<MonitoringVM>();

  protected bannerClass(): string {
    switch (this.vm().polling) {
      case 'paused-hidden': return 'bg-warning-bg text-warning-ink';
      case 'offline':       return 'bg-danger-bg text-danger-ink';
      case 'stale':         return 'bg-warning-bg text-warning-ink';
      default:              return '';
    }
  }

  protected bannerIcon(): string {
    switch (this.vm().polling) {
      case 'paused-hidden': return 'visibility_off';
      case 'offline':       return 'wifi_off';
      case 'stale':         return 'cloud_off';
      default:              return 'info';
    }
  }
}
