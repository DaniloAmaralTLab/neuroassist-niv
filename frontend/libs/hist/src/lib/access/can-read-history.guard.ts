import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessDecision } from '@neuroassist/shared/access-decision';

/**
 * canReadHistoryGuard — /history route.
 * Grants access when the session holds hist.history.read (SPEC-01 §1).
 * Redirects to /forbidden when denied.
 *
 * carry-forward: `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision`
 * — this guard does NOT hardcode `return true`; it defers to AccessDecisionService.
 *
 * TODO[FE-HIST-001]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canReadHistoryGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  const decision: AccessDecision | null = null; // TODO[FE-HIST-001]: inject AccessDecisionService
  if (decision === null) {
    // Stub-phase: allow navigation to unblock development.
    // Replace with: return decision.can('hist.history.read') ? true : router.createUrlTree(['/forbidden']);
    return true;
  }
  if (!decision.can('hist.history.read')) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
