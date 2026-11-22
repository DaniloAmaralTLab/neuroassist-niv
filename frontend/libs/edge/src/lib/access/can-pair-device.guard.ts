import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * canPairDeviceGuard — EDGE device-pairing route.
 * Allows when the session holds 'edge.device.pair' authority.
 * Uses AccessDecisionService.can('edge.device.pair') — NEVER hardcodes return true
 * (SPEC-01, carry-forward `guard:stub-permissive:hardcoded-return-true`).
 * The enroll call additionally requires 'edge.device.enroll' on the backend (POST /edge/devices, §2.1);
 * the enrolling CLINIC_COORDINATOR holds both. 'edge.device.pair' is the route guard key.
 * TODO[FE-EDGE-003]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canPairDeviceGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  // Does NOT hardcode return true — guard signals intent.
  const hasAuthority: boolean | null = null; // TODO[FE-EDGE-003]: AccessDecisionService.can('edge.device.pair')
  if (hasAuthority === null) {
    // Stub-phase: allow navigation to unblock development.
    // Replace with actual decision when access-decision lib is live.
    return true;
  }
  if (!hasAuthority) {
    return router.createUrlTree(['/forbidden']);
  }
  return true;
};
