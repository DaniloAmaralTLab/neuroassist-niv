import { Provider } from '@angular/core';
import { EDGE_DEVICE_PORT } from './api/edge-device.port';
import { EdgeDeviceHttpAdapter } from './api/edge-device-http.adapter';
import { EdgeDeviceMockAdapter } from './api/edge-device-mock.adapter';

export type EdgeAdapterMode = 'http' | 'mock';

export interface EdgeProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — edge-service api-contract is published (SPEC-04 §2, G-EDGE-3).
   * This supersedes the vision default of 'mock' (which was set while edge-service was
   * unarchitected). Pass 'mock' only under explicit dev/test override.
   * Carry-forward: scaffold:mock-adapter-default:shell-provider-not-switched-to-http
   */
  adapter?: EdgeAdapterMode;
}

/**
 * Returns the EDGE module's DI providers.
 * Use in `app.config.ts`:
 *
 * ```ts
 * provideEdge()                        // http (default — edge-service exists)
 * provideEdge({ adapter: 'mock' })     // mock — dev / test only
 * ```
 */
export function provideEdge(config: EdgeProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';

  if (mode === 'mock') {
    return [
      { provide: EDGE_DEVICE_PORT, useClass: EdgeDeviceMockAdapter },
    ];
  }

  return [
    { provide: EDGE_DEVICE_PORT, useClass: EdgeDeviceHttpAdapter },
  ];
}
