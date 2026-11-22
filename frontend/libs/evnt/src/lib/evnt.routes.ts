import { Routes } from '@angular/router';
import { canReadEventGuard } from './access/can-read-event.guard';

/**
 * EVNT_ROUTES — top-level routes contributed by the EVNT module.
 *
 * IMPORTANT: /alarm is a TOP-LEVEL route (outside the shell children), because the
 * full-screen takeover replaces all shell chrome (SPEC-01 §1, SPEC-02 §1).
 * It is registered DIRECTLY in appRoutes, NOT inside AppShellComponent children.
 *
 * The shell-level active-emergency overlay (EvntShellIntegrationService) auto-navigates
 * to /alarm when AlarmFacade.activeEmergency() is truthy (SPEC-06 §3).
 */
export const EVNT_ROUTES: Routes = [
  {
    path: 'alarm',
    loadComponent: () =>
      import('./feature-alarm/alarm-page.component').then(m => m.AlarmPageComponent),
    canActivate: [canReadEventGuard],
  },
];
