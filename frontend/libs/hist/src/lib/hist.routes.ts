import { Routes } from '@angular/router';
import { canReadHistoryGuard } from './access/can-read-history.guard';

/**
 * HIST_ROUTES — routes contributed by @neuroassist/hist.
 *
 * Single navigable route: /history (SPEC-01 §1).
 * Guarded by authGuard + canReadHistoryGuard (hist.history.read).
 *
 * The escalation & detection-lapse trail is a SECTION of the same /history page,
 * NOT a separate route — it is fed by the same hist.history.read read (SPEC-01 §1, BE §2).
 * No write route (ADR-005 — HIST exposes zero create/edit/delete routes).
 */
export const HIST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./feature-history/history-page.component').then(m => m.HistoryPageComponent),
    canActivate: [canReadHistoryGuard],
    title: 'History',
  },
];
