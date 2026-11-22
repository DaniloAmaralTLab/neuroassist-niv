import { Routes } from '@angular/router';
import { canViewDashGuard } from './access/can-view-dash.guard';

// DASH module routes (SPEC-01 — master route table).
// Shell lazy-loads via: loadChildren: () => import('@neuroassist/dash').then(r => r.DASH_ROUTES)
// /home is the default landing after a successful ACS sign-in (SPEC-06 §1).
//
// NOTE: screens/entry is NOT a DASH route — it is a shell route owned by the shell
// (SPEC-06 §4, ADR-005 §5). DASH promotes it as a shell route change only.

export const DASH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [canViewDashGuard],
    loadComponent: () =>
      import('./feature-home/home.component').then(m => m.HomeComponent),
    title: 'Home',
  },
];
