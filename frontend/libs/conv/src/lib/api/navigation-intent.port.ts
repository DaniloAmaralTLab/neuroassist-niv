import { InjectionToken, Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';

// In-process seam (ADR-007 — input-channel-agnostic navigation).
// GEST pushes navigation intents to this port IN-PROCESS — it NEVER calls CONV over HTTP.
// The Patient-Mode host (G1) overrides the default NoOpNavigationIntentPort with
// the GEST-fed implementation when both modules are mounted (INT-FE-CONV-1).

/** Discriminated union of navigation intents GEST can push to CONV (ADR-007 §seam). */
export type NavigationIntent =
  | { type: 'selectByFeatureRef'; featureRef: string }
  | { type: 'descend'; nodeId: string }
  | { type: 'back' };

export interface NavigationIntentPort {
  /** Stream of navigation intents from an external channel (GEST or scan controller). */
  readonly intents$: Observable<NavigationIntent>;
}

export const NAVIGATION_INTENT_PORT = new InjectionToken<NavigationIntentPort>(
  'NavigationIntentPort',
);

/**
 * Default implementation: no-op (empty stream).
 * Active when GEST is not co-mounted in the Patient-Mode host.
 * Touch and switch-scan work without it (ADR-007 §principle 3 — no channel is privileged).
 */
@Injectable()
export class NoOpNavigationIntentPort implements NavigationIntentPort {
  readonly intents$: Observable<NavigationIntent> = EMPTY;
}
