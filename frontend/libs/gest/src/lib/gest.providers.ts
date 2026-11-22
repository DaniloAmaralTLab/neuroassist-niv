import { Provider } from '@angular/core';
import { GESTURE_REPORT_PORT } from './api/gesture-report.port';
import { GestureReportHttpAdapter } from './api/gesture-report-http.adapter';
import { GestureReportMockAdapter } from './api/gesture-report-mock.adapter';
import { CAPABILITY_SUPPORT_PORT } from './api/capability-support.port';
import { CapabilitySupportHttpAdapter } from './api/capability-support-http.adapter';
import { CapabilitySupportMockAdapter } from './api/capability-support-mock.adapter';
import { CATALOG_PORT } from './api/catalog.port';
import { CatalogHttpAdapter } from './api/catalog-http.adapter';
import { CatalogMockAdapter } from './api/catalog-mock.adapter';
import { STATION_LIVENESS_PORT } from './integration/station-liveness.port';
import { NoOpStationLivenessPort } from './integration/no-op-station-liveness.port';

export type GestAdapterMode = 'http' | 'mock';

export interface GestProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — evnt-service and gest-service api-contracts are published (SPEC-04 §2).
   * Carry-forward: scaffold:mock-adapter-default:shell-provider-not-switched-to-http.
   * This providers spec proves the default resolves to HTTP (not mock).
   * Pass 'mock' only under explicit dev/test override.
   */
  adapter?: GestAdapterMode;
}

/**
 * Returns the GEST module's DI providers.
 * Use in the Patient-Mode host's app.config.ts:
 *
 * ```ts
 * provideGest()                       // http (default — evnt-service + gest-service exist)
 * provideGest({ adapter: 'mock' })    // mock — dev / test only
 * ```
 *
 * The STATION_LIVENESS_PORT defaults to NoOpStationLivenessPort.
 * The Patient-Mode host that co-mounts libs/edge MUST override it with libs/edge's
 * concrete StationLivenessService (SAFETY-GEST-1).
 *
 * MODULE_PERMISSION_MAP is EMPTY — GEST has no caregiver authority-gated affordance (SPEC-05 §2).
 */
export function provideGest(config: GestProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';

  const adapterProviders: Provider[] =
    mode === 'mock'
      ? [
          { provide: GESTURE_REPORT_PORT, useClass: GestureReportMockAdapter },
          { provide: CAPABILITY_SUPPORT_PORT, useClass: CapabilitySupportMockAdapter },
          { provide: CATALOG_PORT, useClass: CatalogMockAdapter },
        ]
      : [
          { provide: GESTURE_REPORT_PORT, useClass: GestureReportHttpAdapter },
          { provide: CAPABILITY_SUPPORT_PORT, useClass: CapabilitySupportHttpAdapter },
          { provide: CATALOG_PORT, useClass: CatalogHttpAdapter },
        ];

  return [
    ...adapterProviders,
    // Default no-op liveness port — override with libs/edge's StationLivenessService
    // in the Patient-Mode host (SAFETY-GEST-1, SPEC-06 §2.1)
    { provide: STATION_LIVENESS_PORT, useClass: NoOpStationLivenessPort },
  ];
}
