import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DsCardComponent, DsButtonComponent } from '@neuroassist/shared/ui-components';
import { TenantAdminFacade } from '../tenant-admin.facade';
import { TenantType } from '../api/tenant-admin.port';

// SPEC-01 route: /ops/tenants — TenantAdminPageComponent.
// Guards: authGuard, opsHostGuard (admin host only — ADR-011, INV-5).
// Authority: acs.tenant.onboard — platform-ops service client only.
// This screen is NEVER in the caregiver's daily sidebar (shown only on the admin host).

@Component({
  selector: 'acs-tenant-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DsCardComponent, DsButtonComponent],
  template: `
    <div class="mx-auto max-w-xl p-8">
      <header class="mb-7">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Onboard tenant</h1>
        <p class="mt-1 text-sm text-ink-soft">Create a new care unit. Restricted to platform operators.</p>
      </header>

      <app-ds-card>
        <div class="flex flex-col gap-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-soft">Tenant name</label>
            <input
              class="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              [(ngModel)]="name"
              placeholder="e.g. Amaral Family"
              type="text"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-soft">Type</label>
            <select
              class="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none"
              [(ngModel)]="type"
            >
              <option value="family">Family</option>
              <option value="clinic">Clinic</option>
            </select>
          </div>
        </div>
      </app-ds-card>

      @if (facade.error()) {
        <div class="mt-4 text-sm text-danger-ink">{{ facade.error() }}</div>
      }

      @if (facade.lastOnboarded() !== null) {
        <div class="mt-4 rounded-lg bg-success-bg px-4 py-3 text-sm text-success-ink">
          Tenant "{{ facade.lastOnboarded()!.name }}" created (id: {{ facade.lastOnboarded()!.id }}).
        </div>
      }

      <div class="mt-6">
        <app-ds-button
          [disabled]="!name() || facade.loading()"
          (click)="submit()"
        >
          Create care unit
        </app-ds-button>
      </div>
    </div>
  `,
})
export class TenantAdminPageComponent {
  protected readonly facade = inject(TenantAdminFacade);
  protected readonly name = signal('');
  protected type: TenantType = 'family';

  protected submit(): void {
    if (!this.name()) return;
    this.facade.onboard({ type: this.type, name: this.name() });
  }
}
