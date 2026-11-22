import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PatientsFacade, DevicesFacade, PatientSessionFacade } from '../core/data-access';

// Amendment 3 (2026-08-30) — separate, more restricted shell for when the active device
// is the patient session (mobile phone), not the caregiver's machine. Wireframe decision
// (addendum in design/wireframe.md, 2026-08-30): the patient's mobile phone carries TWO
// independent identities (edge.device for GEST + PatientSession for CONV, see
// ADR-012/014) and much more restricted authorities than the caregiver — only CONV/GEST, no
// History/Calibration/Onboarding. A shell with a full sidebar and a conditional item
// would expose routes the patient has no authority to see; the separate shell never
// renders them, instead of hiding them via client-side RBAC.
//
// Wireframe §3.2.B keeps the "patient mode" indicator as a concept — it lives here,
// not as a conditional variation of the caregiver's Topbar (TopbarComponent).
@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patient-layout">
      <header class="patient-topbar">
        <span class="flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-1 text-xs font-semibold text-info-ink">
          <span class="material-symbols-outlined text-[16px]">smartphone</span>
          Patient session · active since {{ sessionSince() }}
        </span>
        @if (device(); as dev) {
          <span class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                [class]="dev.status === 'online' ? 'bg-success-bg text-success-ink' : 'bg-danger-bg text-danger-ink'">
            <span class="material-symbols-outlined text-[16px]">{{ dev.status === 'online' ? 'wifi' : 'wifi_off' }}</span>
            {{ dev.status === 'online' ? 'Online' : 'Offline' }}
          </span>
        }
      </header>
      <main class="patient-content"><router-outlet /></main>
    </div>
  `,
  styles: [`:host { display: contents; }
    .patient-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .patient-topbar { display: flex; flex-shrink: 0; align-items: center; gap: 0.75rem;
                       height: 3.5rem; padding: 0 1.25rem; border-bottom: 1px solid var(--color-line, #2a2a2a); }
    .patient-content { flex: 1; overflow: auto; background-color: var(--content-bg);
                        background-image: var(--content-mesh); }`],
})
export class PatientShellComponent {
  private readonly patientsFacade = inject(PatientsFacade);
  private readonly devicesFacade = inject(DevicesFacade);
  private readonly sessionsFacade = inject(PatientSessionFacade);

  readonly device = computed(() => this.devicesFacade.items().find(d => d.patientId === this.patientsFacade.items()[0]?.id) ?? null);

  readonly sessionSince = computed(() => {
    const p = this.patientsFacade.items()[0];
    const sess = this.sessionsFacade.items().find(s => s.patientId === p?.id && s.status === 'active');
    if (!sess) return '—';
    const d = new Date(sess.provisionedAt);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
