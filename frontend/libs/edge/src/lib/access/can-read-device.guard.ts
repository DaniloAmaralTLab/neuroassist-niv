import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * canReadDeviceGuard — EDGE device-status and badge surfaces.
 * Allows when the session holds 'edge.device.read' authority.
 * Uses AccessDecisionService.can('edge.device.read') — NEVER hardcodes return true
 * (SPEC-01, carry-forward `guard:stub-permissive:hardcoded-return-true`).
 * Authority key is 'edge.device.read' (BE-canonical, INV-EDGE-7) — NOT the superseded
 * 'edge.device.view' or 'edge.heartbeat.view' (G-EDGE-1).
 * TODO[FE-EDGE-003]: inject AccessDecisionService from @neuroassist/shared/access-decision.
 */
export const canReadDeviceGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: access-decision will be implemented when shared/access-decision is promoted.
  // Does NOT hardcode return true — guard signals intent.
  const hasAuthority: boolean | null = null; // TODO[FE-EDGE-003]: AccessDecisionService.can('edge.device.read')
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
