import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DsCardComponent, DsBadgeComponent } from '@neuroassist/shared/ui-components';
import { HistoryFacade } from '../hist.facade';

// HistoryWidgetComponent — read-only slim projection of the history for DASH/Home embedding.
// Exported from @neuroassist/hist for DASH to consume via HistShellIntegrationService (SPEC-06 §4).
// DASH embeds THIS component — it never queries hist-service directly or re-implements the timeline.
// gated by hist.history.read (same authority as /history route — SPEC-06 §4).
// TODO[FE-HIST-025]: flesh out with real display once DASH module promotes.

@Component({
  selector: 'hist-history-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DsCardComponent, DsBadgeComponent],
  template: `
    <app-ds-card>
      <h3 class="mb-3 font-display text-sm font-semibold text-ink">Recent History</h3>
      @if (facade.loading()) {
        <p class="text-xs text-ink-faint">Loading history…</p>
      } @else if (facade.state() === 'error') {
        <p class="text-xs text-ink-faint">History temporarily unavailable.</p>
      } @else {
        @for (entry of recentEvents(); track entry.id) {
          <div class="flex items-center justify-between py-1.5 text-xs border-b border-line last:border-0">
            <span class="text-ink truncate max-w-[70%]">
              @if (entry.commandLabel) {
                "{{ entry.commandLabel }}"
              } @else {
                {{ entry.title }}
              }
            </span>
            @if (entry.urgency === 'emergency') {
              <app-ds-badge tone="er">emergency</app-ds-badge>
            }
          </div>
        }
        @if (recentEvents().length === 0) {
          <p class="text-xs text-ink-faint">No recent events.</p>
        }
      }
    </app-ds-card>
  `,
})
export class HistoryWidgetComponent {
  protected readonly facade = inject(HistoryFacade);

  /** Show at most 5 event entries in the widget. */
  protected readonly recentEvents = () =>
    this.facade.entries()
      .filter(e => e.kind === 'event')
      .slice(0, 5);
}
