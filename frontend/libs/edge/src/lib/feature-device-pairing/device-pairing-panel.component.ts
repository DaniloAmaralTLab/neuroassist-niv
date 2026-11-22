import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DsCardComponent, DsButtonComponent, DsBadgeComponent } from '@neuroassist/shared/ui-components';
import { DevicePairingVM } from '../device.facade';
import { DeviceStatusBadgeComponent } from '../ui/device-status-badge.component';

// DevicePairingPanelComponent — presentational (SPEC-02 §1).
// The ONE artifact reused in onboarding wizard (step 3) and phone-activation Screen 07
// (mode = 'phone'). Accepts the full DevicePairingVM via input() and emits user events.
// Pairing invariant: 'paired' is shown ONLY when the facade reports it from a server read
// (never optimistic — SPEC-04 §4, INV-EDGE-3).

@Component({
  selector: 'edge-device-pairing-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DsCardComponent, DsButtonComponent, DsBadgeComponent, DeviceStatusBadgeComponent],
  template: `
    <app-ds-card>
      <div class="mb-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-ink-soft">router</span>
        <h2 class="font-display text-sm font-semibold text-ink">
          {{ vm().mode === 'phone' ? 'Patient mobile phone' : 'Edge device' }}
        </h2>
      </div>

      @if (vm().existingDevice; as existing) {
        <!-- Already paired device — no second pair offered (SPEC-03 §2, prototype parity) -->
        <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-success">check_circle</span>
            <span class="text-sm font-medium text-ink">Device already paired</span>
            @if (existing.pairedAt) {
              <span class="text-xs text-ink-faint">· since {{ formatDate(existing.pairedAt) }}</span>
            }
          </div>
          <edge-device-status-badge
            [status]="existing.lifecycleState === 'paired' ? (existing.status ?? 'unavailable') : 'unavailable'"
          />
        </div>
      } @else if (vm().pairing === 'idle') {
        <!-- Idle state — offer pairing if the session holds the authority -->
        <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
          @if (vm().mode === 'phone' && !vm().platformSupported) {
            <span class="text-sm text-ink-soft">
              <span class="material-symbols-outlined align-middle text-[16px] text-warning">warning</span>
              Android or Chromebook required for patient phone pairing (PLAT-001).
            </span>
          } @else {
            <span class="text-sm text-ink-soft">
              No {{ vm().mode === 'phone' ? 'mobile phone' : 'device' }} paired yet.
            </span>
            @if (vm().canPair) {
              <app-ds-button size="sm" variant="secondary" (click)="pairRequested.emit()">
                {{ vm().mode === 'phone' ? 'Pair mobile phone' : 'Pair device' }}
              </app-ds-button>
            } @else {
              <span class="text-xs text-ink-faint">Insufficient permissions</span>
            }
          }
        </div>

      } @else if (vm().pairing === 'pairing') {
        <!-- Pairing in progress — show code + waiting state -->
        <div class="flex flex-col gap-3 rounded-lg bg-surface-2 px-4 py-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined animate-spin text-[18px] text-brand">progress_activity</span>
            <span class="text-sm font-medium text-brand">Pairing in progress…</span>
            <app-ds-badge tone="nf">Waiting for device</app-ds-badge>
          </div>
          @if (vm().pairingCode) {
            <div
              class="mt-1 rounded-md border border-line bg-surface px-4 py-3"
              role="region"
              aria-live="polite"
              aria-label="Device pairing code"
            >
              <p class="mb-1 text-xs font-medium text-ink-soft">Present this code to the device</p>
              <p class="font-display text-2xl font-bold tracking-widest text-ink">{{ vm().pairingCode }}</p>
              @if (vm().pairingCodeExpiresAt) {
                <p class="mt-1 text-xs text-ink-faint">Expires {{ formatDate(vm().pairingCodeExpiresAt!) }}</p>
              }
            </div>
          }
        </div>

      } @else if (vm().pairing === 'paired') {
        <!-- Paired — confirmed by a server read (SPEC-04 §4) -->
        <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
          <span class="flex items-center gap-2 text-sm font-medium text-success-ink">
            <span class="material-symbols-outlined text-[18px]">check_circle</span>
            {{ vm().mode === 'phone' ? 'Mobile phone paired' : 'Device paired' }}
          </span>
          <app-ds-badge tone="ok">Paired</app-ds-badge>
        </div>

      } @else if (vm().pairing === 'error') {
        <!-- Error state -->
        <div class="flex items-center justify-between gap-3 rounded-lg bg-danger-bg px-4 py-3">
          <span class="text-sm text-danger-ink">{{ vm().error ?? 'Pairing failed' }}</span>
          <app-ds-button size="sm" variant="ghost" (click)="retryRequested.emit()">Retry</app-ds-button>
        </div>
      }
    </app-ds-card>
  `,
})
export class DevicePairingPanelComponent {
  /** Full pairing view-model from DeviceFacade.pairingVm(). */
  readonly vm = input.required<DevicePairingVM>();

  /** Emitted when the user clicks "Pair device" / "Pair mobile phone". */
  readonly pairRequested = output<void>();
  /** Emitted when the user clicks "Retry" after an error. */
  readonly retryRequested = output<void>();

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
