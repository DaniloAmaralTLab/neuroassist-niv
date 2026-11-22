import { Injectable } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import {
  PushSubscriptionPort,
  PushSubscriptionRequestWire,
  PushSubscriptionResultWire,
} from './push-subscription.port';

// Mock stub: simulates a successful subscription lifecycle in dev/test.
// The SW and real push are DIFERIDO (require HTTPS + production build — SPEC-04 §5.6, SPEC-06 §5).

@Injectable({ providedIn: 'root' })
export class PushSubscriptionMockAdapter implements PushSubscriptionPort {
  private readonly mockSubscriptions = new Map<string, string>(); // endpoint → id
  private idCounter = 1;

  createSubscription(req: PushSubscriptionRequestWire): Observable<PushSubscriptionResultWire> {
    const existing = this.mockSubscriptions.get(req.endpoint);
    if (existing) {
      // idempotent re-register (200)
      return of({ id: existing, createdAt: new Date().toISOString() }).pipe(delay(300));
    }
    const id = `mock-push-${this.idCounter++}`;
    this.mockSubscriptions.set(req.endpoint, id);
    return of({ id, createdAt: new Date().toISOString() }).pipe(delay(300));
  }

  deleteSubscription(subscriptionId: string): Observable<void> {
    for (const [endpoint, id] of this.mockSubscriptions.entries()) {
      if (id === subscriptionId) {
        this.mockSubscriptions.delete(endpoint);
        break;
      }
    }
    return of(undefined).pipe(
      delay(200),
      map(() => undefined),
    );
  }
}
