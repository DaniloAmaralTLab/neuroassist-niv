import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { PatientsFacade, DevicesFacade } from '../core/data-access';
import { UiStateService } from './ui-state.service';

/**
 * Topbar — active patient + device status always visible (wireframe §3.2.B,
 * Principle 2.6: connectivity status is never hidden).
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex h-16 flex-shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-ink-soft">person</span>
        <span class="text-sm font-semibold text-ink">{{ patient()?.name ?? '—' }}</span>
      </div>
      @if (device(); as dev) {
        <span class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              [class]="dev.status === 'online' ? 'bg-success-bg text-success-ink' : 'bg-danger-bg text-danger-ink'">
          <span class="material-symbols-outlined text-[16px]">{{ dev.status === 'online' ? 'wifi' : 'wifi_off' }}</span>
          Device {{ dev.status === 'online' ? 'online' : 'offline' }}
        </span>
      }
      <div class="flex-1"></div>
      <button (click)="ui.toggleTheme()"
        class="grid size-9 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
        title="Toggle light/dark theme">
        <span class="material-symbols-outlined text-[20px]">{{ ui.theme() === 'light' ? 'dark_mode' : 'light_mode' }}</span>
      </button>
      <div class="grid size-8 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">JA</div>
    </header>
  `,
})
export class TopbarComponent {
  readonly ui = inject(UiStateService);
  private readonly patients = inject(PatientsFacade).items;
  private readonly devices = inject(DevicesFacade).items;
  readonly patient = computed(() => this.patients()[0] ?? null);
  readonly device = computed(() => this.devices()[0] ?? null);
}
