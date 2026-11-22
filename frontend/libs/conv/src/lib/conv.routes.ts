import { Routes } from '@angular/router';
import { patientSessionGuard } from './access/patient-session.guard';

// CONV module routes — SPEC-01 (master route table).
// Shell lazy-loads via: loadChildren: () => import('@neuroassist/conv').then(r => r.CONV_ROUTES)
// mounted at the 'patient' base path in the Patient-Mode host (G1 — undecided host;
// today mounted at /patient in the main AppShellComponent routes, see app.routes.ts).
// CONV registers exactly ONE operational route (/patient/converse, SPEC-01 §1).

export const CONV_ROUTES: Routes = [
  {
    path: 'converse',
    canActivate: [patientSessionGuard],
    loadComponent: () =>
      import('./feature-converse/speech-tree-navigator.component').then(
        m => m.SpeechTreeNavigatorComponent,
      ),
    title: 'Talk',
    data: { breadcrumb: 'Talk' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'converse' },
];
