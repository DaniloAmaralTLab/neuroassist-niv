import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { PatientsFacade, DevicesFacade, PatientSessionFacade, CaregiversFacade } from '../../core/data-access';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { DsBadgeComponent } from '../../ui/ds-badge.component';

// Contract: wireframe.md Screen 07 — Patient mobile phone activation (Amendment 3, 2026-08-30;
// ADR-012 accepted Option C, ADR-014 accepted). Extension of the existing pairing flow
// (Onboarding/Screen 05) for the case "the device is the patient's own mobile phone" — reuses
// the same device-identity model (edge.device, ADR-014) for GEST, and separately provisions
// the PatientSession (ADR-012) for CONV. The session does not expire; revocation is
// mandatory and always visible (constraint SEC-001).

type Pairing = 'idle' | 'pareando' | 'paired';

function dateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${mm}/${dd} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-phone-activation',
  standalone: true,
  imports: [DsCardComponent, DsButtonComponent, DsBadgeComponent],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Activate patient mobile phone</h1>
        <p class="mt-1 text-sm text-ink-soft">Led by the caregiver — the patient does not type any credentials.</p>
      </header>

      <div class="flex flex-col gap-5">
        <app-ds-card>
          <div class="mb-3 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">1</span>
            <h2 class="font-display text-sm font-semibold text-ink">Patient</h2>
          </div>
          <p class="text-sm text-ink">{{ patient()?.name ?? '—' }}</p>
        </app-ds-card>

        <app-ds-card>
          <div class="mb-3 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">2</span>
            <h2 class="font-display text-sm font-semibold text-ink">Patient mobile phone</h2>
          </div>
          <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
            @if (pairing() === 'idle') {
              <span class="text-sm text-ink-soft">No mobile phone paired yet.</span>
              <app-ds-button size="sm" variant="secondary" (click)="parear()">Pair mobile phone</app-ds-button>
            } @else if (pairing() === 'pareando') {
              <span class="flex items-center gap-2 text-sm font-medium text-brand">
                <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Pairing…
              </span>
              <app-ds-badge tone="nf">Waiting</app-ds-badge>
            } @else {
              <span class="flex items-center gap-2 text-sm font-medium text-success-ink">
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                Mobile phone paired as an edge device
              </span>
              <app-ds-badge tone="ok">Online</app-ds-badge>
            }
          </div>
          <p class="mt-2 text-xs text-ink-faint">Reuses the same device-identity model already used by the fixed station (ADR-014) — restricted to Android/Chromium (constraint PLAT-001).</p>
        </app-ds-card>

        <app-ds-card>
          <div class="mb-3 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">3</span>
            <h2 class="font-display text-sm font-semibold text-ink">Persistent session</h2>
          </div>
          <div class="flex items-start gap-2 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning-ink">
            <span class="material-symbols-outlined text-[18px]">warning</span>
            <span>This session does not expire — the patient will not "log in again" on their own. It can be revoked at any time on this screen.</span>
          </div>
        </app-ds-card>

        <div>
          <app-ds-button [disabled]="pairing() !== 'paired'" (click)="activateSession()">
            Activate patient mobile phone
          </app-ds-button>
        </div>
      </div>

      <div class="mt-8">
        <h3 class="mb-3 font-display text-sm font-semibold text-ink">Active sessions for this patient</h3>
        @if (patientSessions().length === 0) {
          <app-ds-card><p class="text-center text-sm text-ink-soft">No active patient session yet.</p></app-ds-card>
        } @else {
          <div class="flex flex-col gap-3">
            @for (sess of patientSessions(); track sess.id) {
              <app-ds-card>
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px] text-ink-soft">smartphone</span>
                    <div>
                      <p class="text-sm font-semibold text-ink">{{ patient()?.name ?? 'Patient' }}'s mobile phone</p>
                      @if (sess.status === 'active') {
                        <p class="text-xs text-ink-soft">Active since {{ dateTime(sess.provisionedAt) }}</p>
                      } @else {
                        <p class="text-xs text-ink-faint">Revoked on {{ sess.revokedAt ? dateTime(sess.revokedAt) : '—' }}</p>
                      }
                    </div>
                  </div>
                  @if (sess.status === 'active') {
                    <app-ds-button size="sm" variant="danger" (click)="revoke(sess.id)">Revoke</app-ds-button>
                  } @else {
                    <app-ds-badge tone="mu">Revoked</app-ds-badge>
                  }
                </div>
              </app-ds-card>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneActivationComponent {
  private readonly patientsFacade = inject(PatientsFacade);
  private readonly devicesFacade = inject(DevicesFacade);
  private readonly caregiversFacade = inject(CaregiversFacade);
  protected readonly sessionsFacade = inject(PatientSessionFacade);
  protected readonly dateTime = dateTime;

  readonly pairing = signal<Pairing>('idle');

  readonly patient = computed(() => this.patientsFacade.items()[0] ?? null);
  readonly patientSessions = computed(() => {
    const p = this.patient();
    if (!p) return [];
    return this.sessionsFacade.items()
      .filter(s => s.patientId === p.id)
      .sort((a, b) => b.provisionedAt.localeCompare(a.provisionedAt));
  });

  protected parear(): void {
    this.pairing.set('pareando');
    setTimeout(() => this.pairing.set('paired'), 1600);
  }

  protected activateSession(): void {
    const p = this.patient();
    const dev = this.devicesFacade.items().find(d => d.patientId === p?.id);
    const caregiver = this.caregiversFacade.items()[0];
    if (!p || !dev || !caregiver) return;
    this.sessionsFacade.provision(p.id, dev.id, caregiver.id);
  }

  protected revoke(sessionId: string): void {
    const caregiver = this.caregiversFacade.items()[0];
    this.sessionsFacade.revoke(sessionId, caregiver?.id ?? '');
  }
}
