import { Routes } from '@angular/router';
import { authGuard } from './access/auth.guard';
import { canReadDeviceGuard } from './access/can-read-device.guard';
import { canPairDeviceGuard } from './access/can-pair-device.guard';

// EDGE module routes (SPEC-01 — master route table).
// Shell lazy-loads via: loadChildren: () => import('@neuroassist/edge').then(r => r.EDGE_ROUTES)
// Every sub-route is lazy via loadComponent (SPEC-01 §3).
// Routes are patient-scoped (/patients/:patientId/device*) — EDGE has NO standalone top-level sidebar entry.

export const EDGE_ROUTES: Routes = [
  {
    path: ':patientId/device',
    canActivate: [authGuard, canReadDeviceGuard],
    loadComponent: () =>
      import('./feature-device-status/edge-device-status-page.component').then(
        m => m.EdgeDeviceStatusPageComponent,
      ),
    title: 'Edge device',
  },
  {
    path: ':patientId/device/pair',
    canActivate: [authGuard, canPairDeviceGuard],
    loadComponent: () =>
      import('./feature-device-pairing/device-pairing-page.component').then(
        m => m.DevicePairingPageComponent,
      ),
    title: 'Pair device',
  },
];
