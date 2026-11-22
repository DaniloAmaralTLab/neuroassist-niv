import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsCardComponent, DsButtonComponent } from '@neuroassist/shared/ui-components';
import { CaregiverFacade, CaregiverRow } from '../caregiver.facade';

// SPEC-01 route: /access/caregivers — CaregiverListPageComponent.
// Guards: authGuard, canManageAccessGuard.
// TODO[FE-ACS-001]: implement full list (pending BE G3 — GET /acs/caregivers not yet in api-contract).
// Currently shows the authenticated caregiver's own profile + links.

@Component({
  selector: 'acs-caregiver-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DsCardComponent, DsButtonComponent],
  template: `
    <div class="mx-auto max-w-4xl p-8">
      <header class="mb-7 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold tracking-tight text-ink">Caregivers</h1>
          <p class="mt-1 text-sm text-ink-soft">Manage who has access to the patient's care.</p>
        </div>
        <app-ds-button [routerLink]="['new']">
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          Register caregiver
        </app-ds-button>
      </header>

      @if (facade.loading()) {
        <p class="text-sm text-ink-soft">Loading…</p>
      } @else if (facade.me() !== null) {
        <app-ds-card>
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[24px] text-ink-soft">account_circle</span>
            <div>
              <p class="text-sm font-semibold text-ink">{{ facade.me()!.username }}</p>
              <p class="text-xs text-ink-soft capitalize">{{ facade.me()!.role }}</p>
            </div>
          </div>
        </app-ds-card>
      } @else {
        <p class="text-sm text-ink-faint">No caregiver data available.</p>
      }

      @if (facade.error()) {
        <div class="mt-4 text-sm text-danger-ink">{{ facade.error() }}</div>
      }
    </div>
  `,
})
export class CaregiverListPageComponent implements OnInit {
  protected readonly facade = inject(CaregiverFacade);

  ngOnInit(): void {
    this.facade.loadMe();
  }
}
