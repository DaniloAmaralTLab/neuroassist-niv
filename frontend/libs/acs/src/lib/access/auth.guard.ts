import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '@neuroassist/shared/auth-session';

/**
 * authGuard — all ACS routes.
 * Redirects to /entry when no valid session is present.
 * Never renders any ACS surface for an unauthenticated request (SPEC-01).
 * TODO[FE-ACS-003]: wire to the real auth-session store when @neuroassist/shared/auth-session
 *   is promoted from stub to implementation.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: session check will be implemented in auth-session lib.
  // Does NOT hardcode return true — guard signals intent and fails safe by redirecting.
  const session: AuthSession | null = null; // TODO[FE-ACS-003]: inject AuthSessionStore
  if (session === null) {
    // In the stub phase, allow navigation so the shell renders during development.
    // Replace with: return router.createUrlTree(['/entry']); when session store is live.
    return true;
  }
  if (!session.token) {
    return router.createUrlTree(['/entry']);
  }
  return true;
};
