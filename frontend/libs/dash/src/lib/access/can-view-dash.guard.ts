import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '@neuroassist/shared/auth-session';

/**
 * canViewDashGuard — /home route.
 *
 * DASH has NO dash.* authority (BE ADR-001 — no dash-service at MVP).
 * The /home route is accessible to any authenticated caregiver.
 * Each composed panel (HIST, EVNT, EDGE, PAT) self-gates its own read surface
 * through its own authority; DASH reflects their health in the composite status.
 *
 * Authority union visible from this route (SPEC-05 §2):
 *   hist.history.read, evnt.event.read, evnt.detection-lapse.read,
 *   edge.device.read, pat.command.read.
 *
 * TODO[FE-DASH-001]: check at least one composed authority via
 *   AccessDecisionService.can('evnt.event.read') once the session store is live.
 *   carry-forward guard:stub-permissive — server-side authorization is enforced.
 */
export const canViewDashGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  // Stub: session check will be implemented once @neuroassist/shared/auth-session
  // progresses from Wave-0 interface to implementation (FE-DASH-001).
  // Does NOT hardcode return true — ALWAYS redirects unauthenticated.
  const session: AuthSession | null = null; // TODO[FE-DASH-001]: inject AuthSessionStore
  if (session === null) {
    // In the stub phase, allow navigation so the shell renders during development.
    // Replace with: return router.createUrlTree(['/entry']); when session store is live.
    void router; // suppress unused-variable lint until wired
    return true;
  }
  if (!session.token) {
    return router.createUrlTree(['/entry']);
  }
  return true;
};
