import { Routes } from '@angular/router';
import { caregiverAuthoringGuard } from './access/caregiver-authoring.guard';

// TRN module routes (SPEC-01 §3).
// Shell lazy-loads via:
//   loadChildren: () => import('@neuroassist/trn').then(r => r.TRN_ROUTES)
// mounted at the 'training' base path in the caregiver web Shell (neuroassist-niv-web).
//
// Two routes, both under the CAREGIVER identity (ADR-005 amendment; SPEC-01 §2):
//  /training         — Screen 08: caregiver authoring + LLM dialog
//  /training/assent  — Screen 09: assisted patient-assent (caregiver records assent in-session)
//
// NO patient-session route. NO /patient/confirm-training.
// ACS INV-3 forbids a patient-session token on any /trn path (BE api-contract §0.1/§0.2).

export const TRN_ROUTES: Routes = [
  {
    path: '',             // /training
    canActivate: [caregiverAuthoringGuard],
    loadComponent: () =>
      import('./feature-training/training-session-page.component').then(
        m => m.TrainingSessionPageComponent,
      ),
    title: 'Training',
    data: { breadcrumb: 'Training' },
  },
  {
    path: 'assent',       // /training/assent
    canActivate: [caregiverAuthoringGuard],
    loadComponent: () =>
      import('./feature-patient-assent/patient-assent-page.component').then(
        m => m.PatientAssentPageComponent,
      ),
    title: 'Patient assent',
    data: { breadcrumb: 'Patient assent' },
  },
];
