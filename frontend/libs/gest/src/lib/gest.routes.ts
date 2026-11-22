import { Routes } from '@angular/router';
import { stationIdentityGuard } from './access/station-identity.guard';

/**
 * GEST module routes (SPEC-01 — master route table).
 *
 * Both routes are gated by the STATION IDENTITY (edge.device token), NOT a
 * caregiver authority (gest.runtime.read / gest.diagnostics.read are dropped —
 * SPEC-01 §2 reconciliation).
 *
 * Shell lazy-loads via:
 *   loadChildren: () => import('@neuroassist/gest').then(r => r.GEST_ROUTES)
 * registered at path 'station' in the Patient-Mode host's app.routes.ts.
 *
 * Every sub-route is lazy via loadComponent (SPEC-01 §3).
 */
export const GEST_ROUTES: Routes = [
  {
    path: 'runtime',
    canActivate: [stationIdentityGuard],
    loadComponent: () =>
      import('./feature-station-runtime/station-runtime-page.component').then(
        m => m.StationRuntimePageComponent,
      ),
    title: 'Station detection',
    // No breadcrumb: near-headless runtime; the patient never navigates (SPEC-01 §1)
    data: { breadcrumb: false },
  },
  {
    path: 'status',
    canActivate: [stationIdentityGuard],
    loadComponent: () =>
      import('./feature-station-status/station-status-page.component').then(
        m => m.StationStatusPageComponent,
      ),
    title: 'Detection status',
    data: { breadcrumb: ['Station', 'Detection status'] },
  },
  {
    // Destination for stationIdentityGuard redirect when station is unpaired
    path: 'unpaired',
    loadComponent: () =>
      import('./feature-station-runtime/station-runtime-page.component').then(
        m => m.StationRuntimePageComponent,
      ),
    title: 'Station unpaired',
    data: { unpaired: true },
  },
];
