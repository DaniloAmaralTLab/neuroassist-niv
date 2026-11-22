import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DsButtonComponent, DsBadgeComponent } from '@neuroassist/shared/ui-components';
import { DeviceFacade, DeviceLifecycleVM } from '../device.facade';
import { EdgeDeviceCardComponent } from './edge-device-card.component';

// EdgeDeviceStatusPageComponent — smart (SPEC-01 §1, SPEC-02 §2).
// Route: /patients/:patientId/device
// Guards: authGuard, canReadDeviceGuard (see edge.routes.ts).
// Lifecycle actions (unpair / deactivate / reactivate / revoke) are behind an explicit confirm
// (SPEC-04 §4). Access decisions come from AccessDecisionService — never inline role checks.

@Component({
  selector: 'edge-device-status-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DsButtonComponent, DsBadgeComponent, EdgeDeviceCardComponent],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-7 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Edge device</h1>
          <p class="mt-1 text-sm text-ink-soft">Device status and lifecycle management.</p>
        </div>
        @if (!facade.device()) {
          <a [routerLink]="['pair']">
            <app-ds-button size="sm">
              <span class="material-symbols-outlined text-[16px]">add</span>
              Pair device
            </app-ds-button>
          </a>
        }
      </header>

      @if (facade.loading()) {
        <p class="text-sm text-ink-soft">Loading…</p>
      } @else {
        <edge-device-card [device]="facade.device()" />

        @if (lifecycleVm(); as lvm) {
          <div class="mt-6">
            <h2 class="mb-3 font-display text-sm font-semibold text-ink">Device lifecycle</h2>

            @if (lvm.confirming) {
              <!-- Confirm dialog for destructive actions -->
              <div class="rounded-lg border border-line bg-surface-2 p-4">
                <p class="mb-3 text-sm text-ink">
                  @switch (lvm.pendingAction) {
                    @case ('unpair') { Are you sure you want to unpair this device? The patient's command catalog will not be affected. }
                    @case ('deactivate') { Are you sure you want to deactivate this device? It can be reactivated later. }
                    @case ('reactivate') { Reactivate this device? }
                    @case ('revoke') { Permanently revoke this device's credential? This cannot be undone — a new enroll and pair will be required. }
                  }
                </p>
                <div class="flex gap-3">
                  <app-ds-button
                    size="sm"
                    [variant]="lvm.pendingAction === 'revoke' ? 'danger' : 'primary'"
                    [disabled]="lvm.submitting"
                    (click)="confirmAction(lvm)"
                  >
                    @if (lvm.submitting) { In progress… }
                    @else { Confirm }
                  </app-ds-button>
                  <app-ds-button size="sm" variant="ghost" [disabled]="lvm.submitting" (click)="facade.cancelAction()">
                    Cancel
                  </app-ds-button>
                </div>
              </div>
            } @else {
              <!-- Available actions (gated by AccessDecisionService, never inline role checks) -->
              <div class="flex flex-wrap gap-2">
                @if (lvm.device.lifecycleState === 'paired' && lvm.canUnpair) {
                  <app-ds-button size="sm" variant="ghost" (click)="facade.setPendingAction('unpair')">
                    <span class="material-symbols-outlined text-[16px]">link_off</span>
                    Unpair
                  </app-ds-button>
                }
                @if (lvm.device.lifecycleState === 'paired' && lvm.canDeactivate) {
                  <app-ds-button size="sm" variant="ghost" (click)="facade.setPendingAction('deactivate')">
                    <span class="material-symbols-outlined text-[16px]">pause_circle</span>
                    Deactivate
                  </app-ds-button>
                }
                @if (lvm.device.lifecycleState === 'deactivated' && lvm.canReactivate) {
                  <app-ds-button size="sm" variant="secondary" (click)="facade.setPendingAction('reactivate')">
                    <span class="material-symbols-outlined text-[16px]">play_circle</span>
                    Reactivate
                  </app-ds-button>
                }
                <!-- Revoke is never offered for 'revoked' (terminal state, INV-EDGE-6) -->
                @if (lvm.device.lifecycleState !== 'revoked' && lvm.canRevoke) {
                  <app-ds-button size="sm" variant="danger" (click)="facade.setPendingAction('revoke')">
                    <span class="material-symbols-outlined text-[16px]">block</span>
                    Revoke credential
                  </app-ds-button>
                }
              </div>
            }
          </div>
        }
      }

      @if (facade.error()) {
        <div class="mt-4 text-sm text-danger-ink">{{ facade.error() }}</div>
      }
    </div>
  `,
})
export class EdgeDeviceStatusPageComponent implements OnInit {
  protected readonly facade = inject(DeviceFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly patientId = signal<string>('');

  // TODO[FE-EDGE-003]: inject AccessDecisionService from @neuroassist/shared/access-decision
  // and derive canUnpair/canDeactivate/canReactivate/canRevoke from it.
  protected readonly lifecycleVm = computed<DeviceLifecycleVM | null>(() =>
    this.facade.lifecycleVm(
      true,  // canUnpair  — TODO[FE-EDGE-003]: AccessDecisionService.can('edge.device.unpair')
      true,  // canDeactivate
      true,  // canReactivate
      true,  // canRevoke
    ),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientId.set(id);
    this.facade.loadForPatient(id);
  }

  protected confirmAction(lvm: DeviceLifecycleVM): void {
    if (!lvm.device) return;
    switch (lvm.pendingAction) {
      case 'unpair':     this.facade.unpair(lvm.device.id);     break;
      case 'deactivate': this.facade.deactivate(lvm.device.id); break;
      case 'reactivate': this.facade.reactivate(lvm.device.id); break;
      case 'revoke':     this.facade.revoke(lvm.device.id);     break;
    }
  }
}
