import { Provider } from '@angular/core';
import { EVENT_PORT } from './api/event.port';
import { PUSH_SUBSCRIPTION_PORT } from './api/push-subscription.port';
import { EventHttpAdapter } from './api/event-http.adapter';
import { EventMockAdapter } from './api/event-mock.adapter';
import { PushSubscriptionHttpAdapter } from './api/push-subscription-http.adapter';
import { PushSubscriptionMockAdapter } from './api/push-subscription-mock.adapter';

export type EvntAdapterMode = 'http' | 'mock';

export interface EvntProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — evnt-service exists and its api-contract is published.
   * Pass 'mock' only under explicit dev/test override.
   *
   * carry-forward: `scaffold:mock-adapter-default:shell-provider-not-switched-to-http`
   * — this default MUST be 'http', not 'mock', because the evnt-service contract is published.
   * The spec providers test should prove the default resolves EventHttpAdapter.
   */
  adapter?: EvntAdapterMode;
}

/**
 * Returns the EVNT module's DI providers.
 * Usage in app.config.ts:
 *
 * ```ts
 * provideEvnt()                        // http (default — evnt-service published)
 * provideEvnt({ adapter: 'mock' })     // mock — dev / test only
 * ```
 */
export function provideEvnt(config: EvntProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http'; // DEFAULT IS 'http' (evnt-service exists)

  if (mode === 'mock') {
    return [
      { provide: EVENT_PORT, useClass: EventMockAdapter },
      { provide: PUSH_SUBSCRIPTION_PORT, useClass: PushSubscriptionMockAdapter },
    ];
  }

  return [
    { provide: EVENT_PORT, useClass: EventHttpAdapter },
    { provide: PUSH_SUBSCRIPTION_PORT, useClass: PushSubscriptionHttpAdapter },
  ];
}
