import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RuntimeFacade } from '../runtime.facade';

/**
 * Station-identity guard — SPEC-01 §1 / SPEC-01 §3.
 *
 * Authorises the runtime and status routes by the STATION IDENTITY: a valid,
 * unrevoked edge.device token (from EDGE, carried by the device-token interceptor).
 *
 * This is NOT AccessDecisionService.can(...) — there is no caregiver gest.* authority
 * (SPEC-01 §2 reconciliation: gest.runtime.read / gest.diagnostics.read are dropped).
 *
 * On absent / expired / revoked station identity (401 / unpaired):
 *  → routes to /station/unpaired and NEVER renders a running detection runtime (INV-GEST-6).
 *
 * Carry-forward: guard:stub-permissive — NEVER hardcode `return true`.
 */
export const stationIdentityGuard: CanActivateFn = (_route, _state) => {
  const runtime = inject(RuntimeFacade);
  const router = inject(Router);

  if (runtime.stationIdentity() === 'valid') {
    return true;
  }

  // Station unpaired / token absent or expired → refuse access to the runtime
  return router.createUrlTree(['/station/unpaired']);
};
