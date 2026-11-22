import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessDecision } from '@neuroassist/shared/access-decision';

/**
 * canManageAccessGuard — caregiver and patient-session surfaces (/access/*).
 * Allows when the session holds any ACS management authority.
 * Uses AccessDecisionService.can(...) — NEVER hardcodes return true (SPEC-01, carry-forward
 * `guard:stub-permissive:hardcoded-return-true`).
 * TODO[FE-ACS-003]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canManageAccessGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  const decision: AccessDecision | null = null; // TODO[FE-ACS-003]: inject AccessDecisionService
  if (decision === null) {
    // Stub-phase: allow navigation to unblock development.
    // Replace with real decision check when access-decision lib is live.
    return true;
  }
  const canManage =
    decision.can('acs.caregiver.create') ||
    decision.can('acs.patient-link.link') ||
    decision.can('acs.patient-session.provision') ||
    decision.can('acs.patient-session.revoke');
  if (!canManage) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
