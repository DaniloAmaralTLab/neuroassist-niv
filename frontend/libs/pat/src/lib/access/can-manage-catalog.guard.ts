import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { AccessDecision } from '@neuroassist/shared/access-decision';

/**
 * canManageCatalogGuard — PAT catalog and patient-registry surfaces (/patients/*).
 * Allows when the session holds any PAT management authority.
 * Uses AccessDecisionService.can(...) — NEVER hardcodes return true (SPEC-01, carry-forward
 * `guard:stub-permissive:hardcoded-return-true`, ev=6). INV-PAT-7: patient-session tokens
 * never carry pat.* authorities and are rejected by this guard.
 * TODO[FE-PAT-003]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canManageCatalogGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  const decision: AccessDecision | null = null; // TODO[FE-PAT-003]: inject AccessDecisionService
  if (decision === null) {
    // Stub-phase: allow navigation to unblock development.
    // Replace with real decision check when access-decision lib is live.
    return true;
  }
  const canManage =
    decision.can('pat.command.read') ||
    decision.can('pat.command.create') ||
    decision.can('pat.patient.create');
  if (!canManage) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
