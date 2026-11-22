import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Push-subscription port — Tier 0 Web Push channel (BE SPEC-11, EVNT ADR-005 §5.6).
// EVNT lib owns the subscription LOGIC; the Shell (neuroassist-niv-web) owns the SW registration.

// ── Wire types (api-contract §6) ──────────────────────────────────────────────

export interface PushSubscriptionRequestWire {
  endpoint: string;                       // from browser PushSubscription.endpoint
  keys: { p256dh: string; auth: string }; // base64url — from PushSubscription.getKey()
  userAgent?: string;                     // optional diagnostics; NOT caregiverId/tenantId (JWT-derived)
}

/** 201 on new subscription; 200 on idempotent re-register (tenantId+endpoint unique). */
export interface PushSubscriptionResultWire {
  id: string;        // BE push-subscription row id — required for DELETE /evnt/push-subscriptions/{id}
  createdAt: string;
}

// ── Port ──────────────────────────────────────────────────────────────────────

export interface PushSubscriptionPort {
  /**
   * POST /evnt/push-subscriptions — evnt.subscription.create.
   * Idempotent on (tenantId, endpoint): 201 for new, 200 for re-register.
   * Never sends caregiverId/tenantId in the body (JWT-derived server-side — INV-EVNT-1).
   */
  createSubscription(req: PushSubscriptionRequestWire): Observable<PushSubscriptionResultWire>;
  /**
   * DELETE /evnt/push-subscriptions/{subscriptionId} — evnt.subscription.delete.
   * Idempotent for owned rows (api-contract §6.2). No body.
   */
  deleteSubscription(subscriptionId: string): Observable<void>;
}

export const PUSH_SUBSCRIPTION_PORT = new InjectionToken<PushSubscriptionPort>('PushSubscriptionPort');
