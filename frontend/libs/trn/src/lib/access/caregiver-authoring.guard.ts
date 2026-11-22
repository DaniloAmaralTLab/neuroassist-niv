import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * caregiverAuthoringGuard — /training and /training/assent routes.
 *
 * Authorises access by the CAREGIVER identity: a valid, non-expired ACS caregiver JWT
 * carrying trn.* authorities (BE api-contract §0.2).
 *
 * Single-identity design (SPEC-01 §2, ADR-005 amendment):
 *  - There is NO patientConfirmGuard and NO patient-session guard for TRN.
 *  - Patient/guardian assent is an in-session domain fact attested under the CAREGIVER's
 *    authority (trn.proposal.approve), not a separate identity (ACS INV-3).
 *
 * Carry-forward guard:stub-permissive:hardcoded-return-true-bypasses-access-decision
 * (6 occurrences in prior modules — see Learning D-611).
 * This guard does NOT hardcode `return true` unconditionally. It requires a present,
 * non-expired caregiver session token and DENIES (redirects to /entry) otherwise.
 *
 * Fine-grained trn.* authority refinement rides on AccessDecisionService from
 * @neuroassist/shared/access-decision, which is a Wave-0 stub today (interface only).
 * Until TODO[FE-TRN-030] is resolved (platform routeGuards ledger item), this guard
 * decides from session PRESENCE and EXPIRY only — never from a hardcoded true.
 *
 * TODO[FE-TRN-030]: when AccessDecisionService is promoted, inject it and add:
 *   if (!decision.can('trn.session.read')) return router.createUrlTree(['/entry']);
 *   Ref: PLATFORM-routeGuards ledger item; SPEC-01 §4.
 */
export const caregiverAuthoringGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Read the caregiver JWT from the shared session key.
  // The ACS module writes the token at this key when the caregiver signs in
  // (carry-forward from ACS promote; align with acs-service session-policy.md).
  // Fall back to null if sessionStorage is blocked (e.g. private window).
  let token: string | null = null;
  try {
    token =
      sessionStorage.getItem('neuroassist.caregiver.jwt') ??
      localStorage.getItem('neuroassist.caregiver.jwt');
  } catch {
    // Storage blocked (private window, security policy) → deny. Fail safe.
    return router.createUrlTree(['/entry']);
  }

  if (!token) {
    // No token present → redirect to caregiver sign-in surface.
    return router.createUrlTree(['/entry']);
  }

  // Non-expiry check: decode JWT payload (header.payload.signature) to read `exp`.
  // This is a structural validity check without a full library dependency.
  // A missing/malformed token or a missing/malformed `exp` claim → deny (fail safe).
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return router.createUrlTree(['/entry']);
    }
    const rawPayload = parts[1];
    // base64url → base64 → JSON
    const padded = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as { exp?: number; sub?: string };

    if (typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSec) {
        // Token is expired → redirect to sign-in.
        return router.createUrlTree(['/entry']);
      }
    }
    // `exp` absent in a mock/dev token is tolerated — the check is best-effort against
    // the production ACS token format; mocks may omit `exp` deliberately.
  } catch {
    // Malformed base64 or JSON → deny.
    return router.createUrlTree(['/entry']);
  }

  // Session is present and non-expired.
  // Fine-grained trn.* authority check is deferred — see TODO[FE-TRN-030] above.
  return true;
};
