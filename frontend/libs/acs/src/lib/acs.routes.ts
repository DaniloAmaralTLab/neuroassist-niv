import { Routes } from '@angular/router';
import { authGuard } from './access/auth.guard';
import { canManageAccessGuard } from './access/can-manage-access.guard';
import { opsHostGuard } from './access/ops-host.guard';

// ACS module routes (SPEC-01 — master route table).
// Shell lazy-loads via: loadChildren: () => import('@neuroassist/acs').then(r => r.ACS_ROUTES)
// Every sub-route is lazy via loadComponent (SPEC-01 §2).

export const ACS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'caregivers',
    pathMatch: 'full',
  },
  {
    path: 'caregivers',
    canActivate: [authGuard, canManageAccessGuard],
    loadComponent: () =>
      import('./feature-caregivers/caregiver-list-page.component').then(
        m => m.CaregiverListPageComponent,
      ),
    title: 'Caregivers',
  },
  {
    path: 'caregivers/new',
    canActivate: [authGuard, canManageAccessGuard],
    loadComponent: () =>
      import('./feature-caregivers/register-caregiver-page.component').then(
        m => m.RegisterCaregiverPageComponent,
      ),
    title: 'Register caregiver',
  },
  {
    path: 'patient-sessions',
    canActivate: [authGuard, canManageAccessGuard],
    loadComponent: () =>
      import('./feature-patient-sessions/patient-sessions-page.component').then(
        m => m.PatientSessionsPageComponent,
      ),
    title: 'Patient sessions',
  },
  {
    path: 'patient-sessions/:patientId',
    canActivate: [authGuard, canManageAccessGuard],
    loadComponent: () =>
      import('./feature-patient-sessions/patient-sessions-page.component').then(
        m => m.PatientSessionsPageComponent,
      ),
    title: 'Patient sessions',
  },
];

// Ops-only route — registered separately at the shell level, not under /access.
// Protected by opsHostGuard (ADR-011 — never shown in the caregiver daily sidebar).
export const ACS_OPS_ROUTES: Routes = [
  {
    path: 'tenants',
    canActivate: [authGuard, opsHostGuard],
    loadComponent: () =>
      import('./feature-tenant-admin/tenant-admin-page.component').then(
        m => m.TenantAdminPageComponent,
      ),
    title: 'Tenants (ops)',
  },
];
