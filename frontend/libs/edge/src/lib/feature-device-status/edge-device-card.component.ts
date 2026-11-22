import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DsCardComponent } from '@neuroassist/shared/ui-components';
import { EdgeDeviceVM } from '../device.facade';
import { DeviceStatusBadgeComponent } from '../ui/device-status-badge.component';

// EdgeDeviceCardComponent — presentational (SPEC-02 §2).
// Reused in: Home dashboard grid, EdgeDeviceStatusPageComponent.
// version is intentionally absent — G-EDGE-2: no BE field exists;
// the card renders version WHERE present and omits the line otherwise (SPEC-03 §1).

function relativeTime(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  return `${Math.floor(diffHr / 24)} d ago`;
}

@Component({
  selector: 'edge-device-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DsCardComponent, DeviceStatusBadgeComponent],
  template: `
    <app-ds-card>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-ink-soft">router</span>
          <span class="text-sm font-semibold text-ink">Edge device</span>
        </div>
        @if (device(); as dev) {
          <edge-device-status-badge
            [status]="dev.lifecycleState === 'paired' ? (dev.status ?? 'unavailable') : 'unavailable'"
            [lastSyncRelative]="lastSync()"
          />
        } @else {
          <edge-device-status-badge status="unavailable" />
        }
      </div>

      @if (device(); as dev) {
        <div class="mt-3 flex flex-col gap-1.5 text-xs text-ink-soft">
          <div class="flex gap-1.5">
            <span class="text-ink-faint">Status</span>
            <span class="capitalize text-ink">{{ dev.lifecycleState }}</span>
          </div>
          @if (dev.pairedAt) {
            <div class="flex gap-1.5">
              <span class="text-ink-faint">Paired</span>
              <span class="text-ink">{{ formatDate(dev.pairedAt) }}</span>
            </div>
          }
          @if (lastSync()) {
            <div class="flex gap-1.5">
              <span class="text-ink-faint">Synced</span>
              <span class="text-ink">{{ lastSync() }}</span>
            </div>
          }
          <!-- version line intentionally absent — G-EDGE-2: no BE field yet (SPEC-03 §1) -->
        </div>
      } @else {
        <p class="mt-3 text-xs text-ink-faint">No device paired for this patient.</p>
      }
    </app-ds-card>
  `,
})
export class EdgeDeviceCardComponent {
  /** null = render "status unavailable"; never default to online (SPEC-03 §1). */
  readonly device = input<EdgeDeviceVM | null>(null);

  protected lastSync(): string | null {
    return relativeTime(this.device()?.lastSyncAt ?? null);
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
