import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { PatientFacade } from './patient.facade';

/**
 * PatRootComponent — entry-point resolver for /patients.
 * Redirects to the first active patient's command catalog, or to /patients/register
 * when no patient exists yet. Single-pilot design (gap G3 — multi-patient picker is out of MVP,
 * see SPEC-01 §1 and contracts/backend-api-cross-link.md gap G3).
 */
@Component({
  selector: 'lib-pat-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full items-center justify-center p-8">
      <p class="text-sm text-ink-soft">Loading patients…</p>
    </div>
  `,
})
export class PatRootComponent {
  private readonly router = inject(Router);
  private readonly patientFacade = inject(PatientFacade);

  constructor() {
    this.patientFacade.load();

    effect(() => {
      const loading = this.patientFacade.loading();
      const patients = this.patientFacade.items();
      if (!loading) {
        if (patients.length > 0) {
          this.router.navigate(['/patients', patients[0].id, 'commands'], {
            replaceUrl: true,
          });
        } else {
          this.router.navigate(['/patients/register'], { replaceUrl: true });
        }
      }
    });
  }
}
