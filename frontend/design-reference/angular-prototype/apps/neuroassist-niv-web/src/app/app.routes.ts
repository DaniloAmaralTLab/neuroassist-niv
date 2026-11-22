import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { PatientShellComponent } from './shell/patient-shell.component';

export const APP_ROUTES: Routes = [
  {
    path: 'entry',
    loadComponent: () =>
      import('./screens/entry/entry.component').then(m => m.EntryComponent),
    data: { label: 'Entry', icon: '•' },
  },
  // Amendment 3 (2026-08-30) — separate, restricted shell for the patient session
  // (ADR-012/014; wireframe decision recorded in design/wireframe.md §3.2.B addendum).
  // Not a navigation destination for the caregiver — it is what the patient's mobile phone shows.
  {
    path: 'patient',
    component: PatientShellComponent,
    children: [
      { path: '', redirectTo: 'converse', pathMatch: 'full' },
      {
        path: 'converse',
        loadComponent: () =>
          import('./screens/conv-tree/conv-tree.component').then(m => m.ConvTreeComponent),
        data: { label: 'Talk', icon: 'chat_bubble' },
      },
      // Amendment 4 (2026-08-31) — Screen 09 of the wireframe. Reachable from the banner on
      // Screen 06 when there are TRAINING proposals awaiting confirmation (ADR-016).
      {
        path: 'confirm-training',
        loadComponent: () =>
          import('./screens/training-confirmation/training-confirmation.component').then(m => m.TrainingConfirmationComponent),
        data: { label: 'Confirm new phrases', icon: 'auto_awesome' },
      },
    ],
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./screens/home/home.component').then(m => m.HomeComponent),
        data: { label: 'Home', icon: '🏠' },
      },
      {
        path: 'alarm',
        loadComponent: () =>
          import('./screens/alarm/alarm.component').then(m => m.AlarmComponent),
        data: { label: 'Alarm', icon: '•' },
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./screens/history/history.component').then(m => m.HistoryComponent),
        data: { label: 'History', icon: '•' },
      },
      {
        path: 'calibration',
        loadComponent: () =>
          import('./screens/calibration/calibration.component').then(m => m.CalibrationComponent),
        data: { label: 'Calibration', icon: '•' },
      },
      {
        path: 'onboarding',
        loadComponent: () =>
          import('./screens/onboarding/onboarding.component').then(m => m.OnboardingComponent),
        data: { label: 'Onboarding', icon: 'rocket_launch' },
      },
      // Amendment 3 (2026-08-30) — Screen 07 of the wireframe. Reachable from Onboarding
      // (demo link), not from the caregiver's daily sidebar — see ADR-012/014.
      {
        path: 'patient-phone',
        loadComponent: () =>
          import('./screens/phone-activation/phone-activation.component').then(m => m.PhoneActivationComponent),
        data: { label: 'Activate patient mobile phone', icon: 'smartphone' },
      },
      // Amendment 4 (2026-08-31) — Screen 08 of the wireframe. Lives in the caregiver shell (DASH),
      // not the patient's — occasional session, not daily use (ADR-016).
      {
        path: 'training',
        loadComponent: () =>
          import('./screens/training/training.component').then(m => m.TrainingComponent),
        data: { label: 'Training', icon: 'auto_awesome' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
