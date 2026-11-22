import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DsCardComponent,
  DsButtonComponent,
} from '@neuroassist/shared/ui-components';
import { PatientFacade } from '../patient.facade';

// Promoted from design-reference/angular-prototype/…/screens/onboarding/onboarding.component.ts
// — PAT-owned steps only: patient registration (step 2 of the shared onboarding wizard).
// ACS owns tenant/caregiver steps; EDGE owns device-pairing.
// Route: /patients/register (SPEC-01 §1, authority pat.patient.create).

@Component({
  selector: 'lib-patient-registration-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DsCardComponent, DsButtonComponent],
  template: `
    <div class="mx-auto max-w-2xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Register patient</h1>
        <p class="mt-1 text-sm text-ink-soft">
          Add the patient to the care unit. You will then be taken to their command catalog.
        </p>
      </header>

      <app-ds-card>
        <div class="mb-5 flex items-center gap-2">
          <span class="grid size-6 place-items-center rounded-full bg-brand-subtle text-xs font-bold text-brand">
            <span class="material-symbols-outlined text-[14px]">person</span>
          </span>
          <h2 class="font-display text-sm font-semibold text-ink">Patient</h2>
        </div>

        <label class="mb-1 block text-xs font-medium text-ink-soft">Patient name</label>
        <input
          [value]="patientLabel()"
          (input)="patientLabel.set($any($event.target).value)"
          placeholder="Full name or preferred name"
          class="h-9 w-full rounded-md border-[1.5px] border-field-line bg-field px-3 font-body text-sm text-ink outline-none focus:border-brand"
        />
        <p class="mt-1.5 text-xs text-ink-faint">
          This name appears throughout the catalog — use the name the family already uses.
        </p>

        @if (error()) {
          <p class="mt-3 text-sm font-medium text-danger">{{ error() }}</p>
        }

        <div class="mt-6 flex items-center gap-3">
          <app-ds-button
            [disabled]="!patientLabel().trim() || loading()"
            (click)="register()">
            @if (loading()) {
              <span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              Registering…
            } @else {
              Register patient
            }
          </app-ds-button>
          <app-ds-button variant="ghost" (click)="goBack()">Cancel</app-ds-button>
        </div>
      </app-ds-card>
    </div>
  `,
})
export class PatientRegistrationPageComponent {
  private readonly router = inject(Router);
  private readonly patientFacade = inject(PatientFacade);

  readonly patientLabel = signal('');
  readonly loading = this.patientFacade.loading;
  readonly error = this.patientFacade.error;

  constructor() {
    // After a successful registration the items signal will grow; navigate to the new patient.
    let prevCount = 0;
    effect(() => {
      const patients = this.patientFacade.items();
      if (!this.patientFacade.loading() && patients.length > prevCount) {
        const newest = patients[patients.length - 1];
        this.router.navigate(['/patients', newest.id, 'commands'], { replaceUrl: true });
      }
      prevCount = patients.length;
    });
  }

  protected register(): void {
    const label = this.patientLabel().trim();
    if (!label) return;
    this.patientFacade.register({ label });
  }

  protected goBack(): void {
    this.router.navigate(['/patients']);
  }
}
