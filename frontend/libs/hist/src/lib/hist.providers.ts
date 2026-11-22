import { Provider } from '@angular/core';
import { HISTORY_PORT } from './api/history.port';
import { HistoryHttpAdapter } from './api/history-http.adapter';
import { HistoryMockAdapter } from './api/history-mock.adapter';

export type HistAdapterMode = 'http' | 'mock';

export interface HistProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — hist-service exists and its api-contract §2 is published.
   * Pass 'mock' only under explicit dev/test override.
   *
   * carry-forward: `scaffold:mock-adapter-default:shell-provider-not-switched-to-http`
   * — this default MUST be 'http', not 'mock', because hist-service api-contract is published.
   * The spec providers test should prove the default resolves HistoryHttpAdapter.
   */
  adapter?: HistAdapterMode;
}

/**
 * Returns the HIST module's DI providers.
 * Usage in app.config.ts:
 *
 * ```ts
 * ...provideHist()                        // http (default — hist-service published)
 * ...provideHist({ adapter: 'mock' })     // mock — dev / test only
 * ```
 */
export function provideHist(config: HistProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';  // DEFAULT IS 'http' (hist-service api-contract published)

  if (mode === 'mock') {
    return [
      { provide: HISTORY_PORT, useClass: HistoryMockAdapter },
    ];
  }

  return [
    { provide: HISTORY_PORT, useClass: HistoryHttpAdapter },
  ];
}
