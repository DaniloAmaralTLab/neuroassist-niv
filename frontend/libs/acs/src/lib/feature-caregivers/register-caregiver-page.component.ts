import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DsCardComponent, DsButtonComponent, DsInputComponent } from '@neuroassist/shared/ui-components';
import { CaregiverFacade } from '../caregiver.facade';
import { CaregiverRole } from '../api/caregiver.port';

// SPEC-01 route: /access/caregivers/new — RegisterCaregiverPageComponent.
// Guards: authGuard, canManageAccessGuard (acs.caregiver.create).
// Extracted from onboarding InviteCaregiverForm (prototype Screen 05 step 5).
// TODO[FE-ACS-002]: full form validation and error handling.

@Component({
  selector: 'acs-register-caregiver-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DsCardComponent, DsButtonComponent, DsInputComponent],
  template: `
    <div class="mx-auto max-w-xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Register caregiver</h1>
        <p class="mt-1 text-sm text-ink-soft">Add a new caregiver to this care unit (tenant).</p>
      </header>

      <app-ds-card>
        <div class="flex flex-col gap-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-soft">Username</label>
            <input
              class="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              [(ngModel)]="username"
              placeholder="e.g. ana.silva"
              type="text"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-soft">Password</label>
            <input
              class="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              [(ngModel)]="password"
              placeholder="Temporary password"
              type="password"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-soft">Role</label>
            <select
              class="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none"
              [(ngModel)]="role"
            >
              <option value="caregiver">Caregiver</option>
              <option value="clinic_coordinator">Clinic Coordinator</option>
            </select>
          </div>
        </div>
      </app-ds-card>

      @if (facade.error()) {
        <div class="mt-4 text-sm text-danger-ink">{{ facade.error() }}</div>
      }

      <div class="mt-6 flex gap-3">
        <app-ds-button
          [disabled]="!username() || !password() || facade.loading()"
          (click)="submit()"
        >
          Register
        </app-ds-button>
        <app-ds-button variant="secondary" (click)="cancel()">Cancel</app-ds-button>
      </div>
    </div>
  `,
})
export class RegisterCaregiverPageComponent {
  protected readonly facade = inject(CaregiverFacade);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected role: CaregiverRole = 'caregiver';

  protected submit(): void {
    if (!this.username() || !this.password()) return;
    this.facade.register({
      username: this.username(),
      password: this.password(),
      role: this.role,
    });
    this.router.navigate(['/access/caregivers']);
  }

  protected cancel(): void {
    this.router.navigate(['/access/caregivers']);
  }
}
