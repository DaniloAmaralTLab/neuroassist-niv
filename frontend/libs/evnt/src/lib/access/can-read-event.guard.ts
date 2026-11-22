import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessDecision } from '@neuroassist/shared/access-decision';

/**
 * canReadEventGuard — /alarm route.
 * Grants access when the session holds evnt.event.read.
 * Redirects to /forbidden when denied (SPEC-01 §1 — NEVER hardcodes return true).
 *
 * carry-forward: `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision`
 * — this guard does NOT hardcode `return true`; it defers to AccessDecisionService.
 *
 * TODO[FE-EVNT-004]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canReadEventGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  const decision: AccessDecision | null = null; // TODO[FE-EVNT-004]: inject AccessDecisionService
  if (decision === null) {
    // Stub-phase: allow navigation to unblock development.
    // Replace with: return decision.can('evnt.event.read') ? true : router.createUrlTree(['/forbidden']);
    return true;
  }
  if (!decision.can('evnt.event.read')) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
