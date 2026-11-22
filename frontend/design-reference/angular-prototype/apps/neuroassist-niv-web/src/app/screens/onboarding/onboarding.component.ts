import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DevicesFacade, TenantsFacade, PatientsFacade, CaregiversFacade } from '../../core/data-access';
import { DsCardComponent } from '../../ui/ds-card.component';
import { DsButtonComponent } from '../../ui/ds-button.component';
import { DsInputComponent } from '../../ui/ds-input.component';
import { DsBadgeComponent } from '../../ui/ds-badge.component';

// Contract: .build-plans/onboarding.plan.md  (the implementer reads ONLY the build-plan)
// Wireframe ref: §5.1–5.5 — Onboarding
// Goal: initial registration of tenant, patient and edge-device pairing —
// done once by the technical operator, not by the caregiver day to day (flow 4.5).
// (Amendment 1) step 4 points to the command catalog (Screen 04), no longer a single calibration.
// The pairing state reads the real DevicesFacade — if a EdgeDevice already exists
// (same source as Home/Topbar), it shows "paired" directly instead of simulating from scratch.

type Pairing = 'idle' | 'pareando' | 'paired';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [RouterLink, DsCardComponent, DsButtonComponent, DsInputComponent, DsBadgeComponent],
  template: `
    <div class="mx-auto max-w-6xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Initial setup</h1>
        <p class="mt-1 text-sm text-ink-soft">One-time step, led by the technical operator — not part of the caregiver's daily use.</p>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <!-- Main column: wizard steps -->
        <div class="flex flex-col gap-5">
          <app-ds-card>
            <div class="mb-3 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">1</span>
              <h2 class="font-display text-sm font-semibold text-ink">Care unit</h2>
            </div>
            <app-ds-input placeholder="Family or clinic name" [(value)]="tenantName" icon="home" />
          </app-ds-card>

          <app-ds-card>
            <div class="mb-3 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">2</span>
              <h2 class="font-display text-sm font-semibold text-ink">Patient</h2>
            </div>
            <app-ds-input placeholder="Patient name" [(value)]="patientName" icon="person" />
          </app-ds-card>

          <app-ds-card>
            <div class="mb-3 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">3</span>
              <h2 class="font-display text-sm font-semibold text-ink">Edge device</h2>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
              @if (pairingEffective() === 'idle') {
                <span class="text-sm text-ink-soft">No device paired yet.</span>
                <app-ds-button size="sm" variant="secondary" (click)="parear()">Pair device</app-ds-button>
              } @else if (pairingEffective() === 'pareando') {
                <span class="flex items-center gap-2 text-sm font-medium text-brand">
                  <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Pairing…
                </span>
                <app-ds-badge tone="nf">Waiting</app-ds-badge>
              } @else if (deviceExisting(); as dev) {
                <span class="flex items-center gap-2 text-sm font-medium text-success-ink">
                  <span class="material-symbols-outlined text-[18px]">check_circle</span>
                  Device already paired · version {{ dev.version }}
                </span>
                <app-ds-badge [tone]="dev.status === 'online' ? 'ok' : 'er'">{{ dev.status === 'online' ? 'Online' : 'Offline' }}</app-ds-badge>
              } @else {
                <span class="flex items-center gap-2 text-sm font-medium text-success-ink">
                  <span class="material-symbols-outlined text-[18px]">check_circle</span>
                  Device paired
                </span>
                <app-ds-badge tone="ok">Online</app-ds-badge>
              }
            </div>
          </app-ds-card>

          <app-ds-card>
            <div class="mb-3 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">4</span>
              <h2 class="font-display text-sm font-semibold text-ink">First command</h2>
            </div>
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-ink-soft">Configure at least 1 command (gesture → need) in the catalog before inviting the caregiver.</p>
              <a routerLink="/calibration" class="flex-shrink-0">
                <app-ds-button size="sm" variant="secondary">
                  Go to catalog <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </app-ds-button>
              </a>
            </div>
          </app-ds-card>

          <app-ds-card>
            <div class="mb-3 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">5</span>
              <h2 class="font-display text-sm font-semibold text-ink">Invite caregiver</h2>
            </div>
            <div class="flex gap-3">
              <app-ds-input class="flex-1" placeholder="Caregiver name" [(value)]="caregiverName" icon="person" />
              <app-ds-input class="flex-1" placeholder="Email" type="email" [(value)]="caregiverEmail" icon="mail" />
            </div>
          </app-ds-card>

          <!-- Amendment 3 (2026-08-30) — Screen 07, optional, outside the 5 numbered steps
               (the fixed edge device already covers the majority case). -->
          <app-ds-card>
            <div class="mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-ink-faint">smartphone</span>
              <h2 class="font-display text-sm font-semibold text-ink">Optional — patient mobile phone</h2>
            </div>
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-ink-soft">If the patient can operate their own mobile phone (e.g. Tobii), activate a persistent session on it.</p>
              <a routerLink="/patient-phone" class="flex-shrink-0">
                <app-ds-button size="sm" variant="secondary">
                  Activate mobile phone <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </app-ds-button>
              </a>
            </div>
          </app-ds-card>
        </div>

        <!-- Side column: progress + completion -->
        <div class="flex flex-col gap-6">
          <app-ds-card>
            <h3 class="mb-3 font-display text-sm font-semibold text-ink">Progress</h3>
            <div class="flex flex-col gap-2.5">
              @for (item of checklist(); track item.label) {
                <div class="flex items-center gap-2.5 text-sm">
                  <span class="material-symbols-outlined text-[18px]" [class]="item.done ? 'text-success' : 'text-ink-faint'">
                    {{ item.done ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                  <span [class]="item.done ? 'text-ink' : 'text-ink-soft'">{{ item.label }}</span>
                </div>
              }
            </div>
          </app-ds-card>

          <app-ds-card>
            <p class="text-xs text-ink-soft">Complete all the steps alongside to unlock the caregiver's daily dashboard.</p>
            <div class="mt-4">
              <app-ds-button [disabled]="!podeConcluir()" (click)="concluir()">Complete setup</app-ds-button>
            </div>
            @if (done()) {
              <p class="mt-3 flex items-center gap-1.5 text-sm font-medium text-success-ink">
                <span class="material-symbols-outlined text-[18px]">check_circle</span> Setup complete
              </p>
            }
          </app-ds-card>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent {
  private readonly devicesFacade = inject(DevicesFacade);
  private readonly tenantsFacade = inject(TenantsFacade);
  private readonly patientsFacade = inject(PatientsFacade);
  private readonly caregiversFacade = inject(CaregiversFacade);

  readonly tenantName = signal('');
  readonly patientName = signal('');
  readonly caregiverName = signal('');
  readonly caregiverEmail = signal('');
  readonly pairing = signal<Pairing>('idle');
  readonly done = signal(false);

  constructor() {
    // Pre-fills with what already exists in the real facades (same source as
    // Home/History/Calibration) instead of fixed literal values — the mock
    // represents an already-configured family, not a blank form.
    effect(() => {
      const t = this.tenantsFacade.items()[0];
      if (t) this.tenantName.set(t.name);
    });
    effect(() => {
      const p = this.patientsFacade.items()[0];
      if (p) this.patientName.set(p.name);
    });
    effect(() => {
      const c = this.caregiversFacade.items()[0];
      if (c) {
        this.caregiverName.set(c.name);
        this.caregiverEmail.set(c.email);
      }
    });
  }

  /** EdgeDevice already existing in the same source as Home/Topbar (1:1 per patient). */
  readonly deviceExisting = computed(() => this.devicesFacade.items()[0] ?? null);

  /** Displayed state: if a real device already exists, it is "paired" directly — the simulated
   * pairing flow (parear()) only appears when there is genuinely none yet. */
  readonly pairingEffective = computed<Pairing>(() =>
    this.deviceExisting() ? 'paired' : this.pairing(),
  );

  readonly checklist = computed(() => [
    { label: 'Care unit', done: this.tenantName().trim().length > 0 },
    { label: 'Patient', done: this.patientName().trim().length > 0 },
    { label: 'Device paired', done: this.pairingEffective() === 'paired' },
    { label: 'Caregiver invited', done: this.caregiverEmail().trim().length > 0 },
  ]);

  readonly podeConcluir = computed(() =>
    this.tenantName().trim().length > 0 &&
    this.patientName().trim().length > 0 &&
    this.pairingEffective() === 'paired' &&
    this.caregiverEmail().trim().length > 0,
  );

  protected parear(): void {
    this.pairing.set('pareando');
    setTimeout(() => this.pairing.set('paired'), 1600);
  }

  protected concluir(): void {
    this.done.set(true);
    // TODO[fe-autopilot]: persist Tenant, Patient, EdgeDevice, Caregiver and the first Command via HttpAdapters
  }
}
