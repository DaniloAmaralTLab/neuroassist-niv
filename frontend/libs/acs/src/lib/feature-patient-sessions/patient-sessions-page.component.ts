import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { DsCardComponent, DsButtonComponent, DsBadgeComponent } from '@neuroassist/shared/ui-components';
import { PatientSessionFacade, PatientSessionRow } from '../patient-session.facade';

// Promoted from design-reference: screens/phone-activation/phone-activation.component.ts
// Source: wireframe.md Screen 07 — Patient mobile phone activation (Amendment 3, 2026-08-30;
// ADR-012 Option C, ADR-014 accepted).
// Connected to PatientSessionFacade via PATIENT_SESSION_PORT (P4).
// Mock data removed; prototype facades replaced with the ACS Port/Adapter/Facade layer.

type PairingState = 'idle' | 'pairing' | 'paired';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'acs-patient-sessions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DsCardComponent, DsButtonComponent, DsBadgeComponent],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Activate patient mobile phone</h1>
        <p class="mt-1 text-sm text-ink-soft">Led by the caregiver — the patient does not type any credentials.</p>
      </header>

      @if (facade.error()) {
        <div class="mb-5 flex items-center gap-2 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-ink">
          <span class="material-symbols-outlined text-[18px]">error</span>
          {{ facade.error() }}
        </div>
      }

      <div class="flex flex-col gap-5">
        <app-ds-card>
          <div class="mb-3 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">1</span>
            <h2 class="font-display text-sm font-semibold text-ink">Patient</h2>
          </div>
          <p class="text-sm text-ink">{{ patientName() }}</p>
        </app-ds-card>

        <app-ds-card>
          <div class="mb-3 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">2</span>
            <h2 class="font-display text-sm font-semibold text-ink">Patient mobile phone</h2>
          </div>
          <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3">
            @if (pairing() === 'idle') {
              <span class="text-sm text-ink-soft">No mobile phone paired yet.</span>
              <app-ds-button size="sm" variant="secondary" (click)="startPairing()">Pair mobile phone</app-ds-button>
            } @else if (pairing() === 'pairing') {
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
          <app-ds-button
            [disabled]="pairing() !== 'paired' || facade.loading()"
            (click)="activateSession()"
          >
            @if (facade.loading()) {
              <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            }
            Activate patient mobile phone
          </app-ds-button>
        </div>
      </div>

      <div class="mt-8">
        <h3 class="mb-3 font-display text-sm font-semibold text-ink">Active sessions for this patient</h3>
        @if (currentSession() === null) {
          <app-ds-card>
            <p class="text-center text-sm text-ink-soft">No active patient session yet.</p>
          </app-ds-card>
        } @else {
          <app-ds-card>
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-ink-soft">smartphone</span>
                <div>
                  <p class="text-sm font-semibold text-ink">{{ patientName() }}'s mobile phone</p>
                  @if (currentSession()!.status === 'active') {
                    <p class="text-xs text-ink-soft">Active since {{ formatDateTime(currentSession()!.createdAt) }}</p>
                  } @else {
                    <p class="text-xs text-ink-faint">
                      Revoked on {{ currentSession()!.revokedAt ? formatDateTime(currentSession()!.revokedAt!) : '—' }}
                    </p>
                  }
                </div>
              </div>
              @if (currentSession()!.status === 'active') {
                <app-ds-button
                  size="sm"
                  variant="danger"
                  [disabled]="facade.loading()"
                  (click)="revokeSession(currentSession()!.id)"
                >
                  Revoke
                </app-ds-button>
              } @else {
                <app-ds-badge tone="mu">Revoked</app-ds-badge>
              }
            </div>
          </app-ds-card>
        }
      </div>
    </div>
  `,
})
export class PatientSessionsPageComponent implements OnInit {
  protected readonly facade = inject(PatientSessionFacade);
  protected readonly formatDateTime = formatDateTime;

  /** Pairing state — UI-only, not persisted. */
  protected readonly pairing = signal<PairingState>('idle');

  /**
   * Active patient name — populated from route param or query in the full implementation.
   * TODO[FE-ACS-005]: read patientId from route and load patient name from PatientFacade.
   */
  protected readonly patientName = signal<string>('Loading…');

  /** Currently loaded or provisioned session. */
  readonly currentSession = computed<PatientSessionRow | null>(() => this.facade.session());

  /**
   * Device id used for provisioning — populated after pairing.
   * TODO[FE-ACS-005]: read deviceId from the edge-service pairing result.
   */
  private pendingDeviceId: string | null = null;

  ngOnInit(): void {
    // Load the most recently provisioned session when the page opens.
    // TODO[FE-ACS-005]: read sessionId from route param and call facade.loadSession(id).
    const lastId = this.facade.lastProvisionedId();
    if (lastId) {
      this.facade.loadSession(lastId);
    }
  }

  protected startPairing(): void {
    this.pairing.set('pairing');
    // Simulate pairing completion — real pairing via EDGE service.
    setTimeout(() => {
      this.pendingDeviceId = `edge-${Date.now()}`;
      this.pairing.set('paired');
    }, 1600);
  }

  protected activateSession(): void {
    if (this.pairing() !== 'paired' || !this.pendingDeviceId) return;
    // TODO[FE-ACS-005]: read patientId from route param.
    const patientId = 'pat-marcio'; // placeholder until route is wired
    this.facade.provision({ patientId, deviceId: this.pendingDeviceId });
  }

  protected revokeSession(id: string): void {
    // Pessimistic revoke — facade awaits 204 before updating state (SEC-001).
    this.facade.revoke(id);
  }
}
