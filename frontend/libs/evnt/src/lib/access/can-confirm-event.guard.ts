import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessDecision } from '@neuroassist/shared/access-decision';

/**
 * canConfirmEventGuard — alarm confirm action gating.
 * The acknowledge action is additionally gated at the handler (not only the route),
 * because a caregiver may hold evnt.event.read but NOT evnt.event.confirm (SPEC-01 §1).
 *
 * carry-forward: `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision`
 *
 * TODO[FE-EVNT-004]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canConfirmEventGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  const decision: AccessDecision | null = null; // TODO[FE-EVNT-004]: inject AccessDecisionService
  if (decision === null) {
    // Stub-phase: allow to unblock development.
    return true;
  }
  if (!decision.can('evnt.event.confirm')) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
