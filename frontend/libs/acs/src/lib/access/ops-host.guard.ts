import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * opsHostGuard — /ops/tenants only.
 * Allows navigation only when the app is served from the admin host/network (ADR-011, INV-5).
 * Off-host: blocks route AND hides the Ops menu entry in the sidebar (SPEC-01, SPEC-06).
 * Host detection: compares window.location.hostname against the ACS_OPS_HOST allowlist (SPEC-05 §4).
 * TODO[FE-ACS-003]: read ACS_OPS_HOST allowlist from environment/token.
 */
export const opsHostGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Stub: in development the guard always blocks /ops/tenants to match the production default.
  // The admin host is never the same as the caregiver daily host (ADR-011, Option 1).
  const isAdminHost = false; // TODO[FE-ACS-003]: implement host detection from ACS_OPS_HOST
  if (!isAdminHost) {
    return router.createUrlTree(['/access']);
  }
  return true;
};
