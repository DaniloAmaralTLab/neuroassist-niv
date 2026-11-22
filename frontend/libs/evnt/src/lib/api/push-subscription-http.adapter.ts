import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ACCESS_HTTP_BASE } from '@neuroassist/shared/access-http-base';
import {
  PushSubscriptionPort,
  PushSubscriptionRequestWire,
  PushSubscriptionResultWire,
} from './push-subscription.port';

// Base: ${ACCESS_HTTP_BASE}/evnt  (NOT /api/v1 — carry-forward `http-adapter:wrong-prefix`).
// Push subscription wiring: EVNT lib owns the subscription logic;
// the Shell owns the SW registration and notificationclick (SPEC-06 §5).
// Requires HTTPS (or localhost) and a production build for real push (DIFERIDO in dev).

@Injectable({ providedIn: 'root' })
export class PushSubscriptionHttpAdapter implements PushSubscriptionPort {
  private readonly http = inject(HttpClient);
  private readonly base = `${ACCESS_HTTP_BASE}/evnt`;

  createSubscription(req: PushSubscriptionRequestWire): Observable<PushSubscriptionResultWire> {
    // Body: exactly { endpoint, keys:{p256dh,auth}, userAgent? }
    // carry-forward: `http-adapter:request-body-field-whitelist` — do NOT send caregiverId/tenantId
    return this.http.post<PushSubscriptionResultWire>(
      `${this.base}/push-subscriptions`,
      {
        endpoint: req.endpoint,
        keys: req.keys,
        ...(req.userAgent ? { userAgent: req.userAgent } : {}),
      },
    );
  }

  deleteSubscription(subscriptionId: string): Observable<void> {
    return this.http
      .delete(`${this.base}/push-subscriptions/${subscriptionId}`)
      .pipe(map(() => undefined));
  }
}
