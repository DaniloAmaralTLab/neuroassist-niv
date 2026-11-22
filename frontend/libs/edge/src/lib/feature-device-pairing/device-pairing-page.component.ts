import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DeviceFacade, DevicePairingVM } from '../device.facade';
import { DevicePairingPanelComponent } from './device-pairing-panel.component';

// DevicePairingPageComponent — smart (SPEC-01 §1, SPEC-02 §1).
// Route: /patients/:patientId/device/pair
// Guards: authGuard, canPairDeviceGuard (see edge.routes.ts).
// The panel component is the same artifact used in the onboarding wizard and Screen 07.

@Component({
  selector: 'edge-device-pairing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DevicePairingPanelComponent],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Pair device</h1>
        <p class="mt-1 text-sm text-ink-soft">
          Connect an edge agent (station or mobile phone) to this patient.
        </p>
      </header>

      @if (facade.loading()) {
        <p class="text-sm text-ink-soft">Loading…</p>
      } @else {
        <edge-device-pairing-panel
          [vm]="pairingVm()"
          (pairRequested)="onPairRequested()"
          (retryRequested)="onRetryRequested()"
        />
      }

      @if (facade.error()) {
        <div class="mt-4 text-sm text-danger-ink">{{ facade.error() }}</div>
      }
    </div>
  `,
})
export class DevicePairingPageComponent implements OnInit {
  protected readonly facade = inject(DeviceFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly patientId = signal<string>('');

  protected readonly pairingVm = computed<DevicePairingVM>(() =>
    this.facade.pairingVm('station', true /* canPair: TODO[FE-EDGE-003] AccessDecisionService */, true),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientId.set(id);
    this.facade.loadForPatient(id);
  }

  protected onPairRequested(): void {
    this.facade.enroll(this.patientId());
  }

  protected onRetryRequested(): void {
    this.facade.resetPairing();
  }
}
