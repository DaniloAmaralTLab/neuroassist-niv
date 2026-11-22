import { Routes } from '@angular/router';
import { canManageCatalogGuard } from './access/can-manage-catalog.guard';
import { PatRootComponent } from './pat-root.component';

// PAT module routes (SPEC-01 — master route table).
// Shell lazy-loads via: loadChildren: () => import('@neuroassist/pat').then(r => r.PAT_ROUTES)
// /patients entry loads PatRootComponent which redirects to :patientId/commands or /patients/register.
// Sub-routes use loadComponent (SPEC-01 §2).

export const PAT_ROUTES: Routes = [
  {
    path: '',
    component: PatRootComponent,
    canActivate: [canManageCatalogGuard],
    title: 'Patients & Commands',
  },
  {
    path: 'register',
    canActivate: [canManageCatalogGuard],
    loadComponent: () =>
      import('./feature-patient-registry/patient-registration-page.component').then(
        m => m.PatientRegistrationPageComponent,
      ),
    title: 'Register patient',
  },
  {
    path: ':patientId/commands',
    canActivate: [canManageCatalogGuard],
    loadComponent: () =>
      import('./feature-command-catalog/command-catalog-page.component').then(
        m => m.CommandCatalogPageComponent,
      ),
    title: 'Command catalog',
  },
];
