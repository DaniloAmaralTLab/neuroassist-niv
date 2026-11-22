import { Routes } from '@angular/router';
import { AppShellComponent } from './shell/app-shell.component';

export const appRoutes: Routes = [
  // EVNT — /alarm is a TOP-LEVEL route (outside AppShellComponent).
  // The full-screen emergency takeover replaces all shell chrome (SPEC-01 §1, SPEC-02 §1).
  // Registered BEFORE the shell catch-all so it is matched first.
  {
    path: 'alarm',
    loadChildren: () => import('@neuroassist/evnt').then(r => r.EVNT_ROUTES),
  },
  // DASH — /entry is a TOP-LEVEL route (outside AppShellComponent).
  // Static brand/login moment with no operational data (SPEC-06 §4, ADR-005 §5).
  // Its CTA drives the ACS login flow; on success, the shell redirects to /home.
  // Owner: shell (not DASH — DASH never registers entry in DASH_ROUTES).
  // Promoted by /fe-architect-promote neuroassist-niv DASH.
  {
    path: 'entry',
    loadComponent: () =>
      import('./screens/entry.component').then(m => m.EntryComponent),
    title: 'Welcome',
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      // DASH — /home is the default landing after successful ACS sign-in (SPEC-06 §1).
      // Promoted by /fe-architect-promote neuroassist-niv DASH.
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadChildren: () => import('@neuroassist/dash').then(r => r.DASH_ROUTES),
      },
      // ACS — Caregivers and Access (promoted by /fe-architect-promote neuroassist-niv ACS)
      {
        path: 'access',
        loadChildren: () => import('@neuroassist/acs').then(r => r.ACS_ROUTES),
      },
      // PAT + EDGE — both are patient-scoped and share the /patients prefix.
      // Combined lazily to avoid duplicate-path routing: PAT routes (command-catalog, register)
      // and EDGE routes (:patientId/device, :patientId/device/pair) are served from one entry.
      // The static segments ('command-catalog', 'register') take priority over :patientId.
      {
        path: 'patients',
        loadChildren: async () => {
          const [pat, edge] = await Promise.all([
            import('@neuroassist/pat'),
            import('@neuroassist/edge'),
          ]);
          return [...pat.PAT_ROUTES, ...edge.EDGE_ROUTES];
        },
      },
      // GEST — Station Detection (promoted by /fe-architect-promote neuroassist-niv GEST)
      // Patient-Mode station context — gated by the edge.device identity (stationIdentityGuard).
      // No caregiver sidebar entry. Host app: undecided (G1).
      {
        path: 'station',
        loadChildren: () => import('@neuroassist/gest').then(r => r.GEST_ROUTES),
      },
      // HIST — History and Audit Trail (promoted by /fe-architect-promote neuroassist-niv HIST)
      // Single route: /history — guards authGuard + canReadHistoryGuard (hist.history.read).
      // Escalation & detection-lapse trail is a section of the same page (SPEC-01 §1, no extra route).
      {
        path: 'history',
        loadChildren: () => import('@neuroassist/hist').then(r => r.HIST_ROUTES),
      },
      // Additional modules added progressively via /fe-architect-promote.
    ],
  },
  { path: '**', redirectTo: '' },
];
