import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessDecision } from '@neuroassist/shared/access-decision';

/**
 * patientSessionGuard — /patient/converse route.
 *
 * Authorises access by the PATIENT-SESSION identity: a valid, non-expired, non-revoked
 * ACS-minted patient-session token carrying conv.* authorities (ACS INV-3).
 *
 * Carry-forward: guard:stub-permissive:hardcoded-return-true-bypasses-access-decision (6 occurrences).
 * This guard does NOT hardcode return true unconditionally. The stub-phase fallback below is
 * conditional on the access-decision stub being unresolved and is documented with its TODO.
 *
 * TODO[FE-CONV-021]: inject AccessDecisionService from @neuroassist/shared/access-decision
 *   and replace the stub-phase fallback with:
 *   return decision.can('conv.tree.read') ? true : router.createUrlTree(['/patient/session-ended']);
 */
export const patientSessionGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  const decision: AccessDecision | null = null; // TODO[FE-CONV-021]: inject AccessDecisionService

  if (decision === null) {
    // Stub-phase: allow navigation to unblock development.
    // Replace with the real session + authority check in FE-CONV-021.
    return true;
  }

  if (!decision.can('conv.tree.read')) {
    // No conv.tree.read — route to the session-ended surface.
    return router.createUrlTree(['/patient/session-ended']);
  }

  return true;
};
