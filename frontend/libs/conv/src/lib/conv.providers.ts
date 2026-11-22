import { Provider } from '@angular/core';
import { TREE_SNAPSHOT_PORT } from './api/tree-snapshot.port';
import { AUDIO_ASSET_PORT } from './api/audio-asset.port';
import { USAGE_SIGNAL_PORT } from './api/usage-signal.port';
import { NAVIGATION_INTENT_PORT, NoOpNavigationIntentPort } from './api/navigation-intent.port';
import { TreeSnapshotHttpAdapter } from './api/tree-snapshot-http.adapter';
import { TreeSnapshotMockAdapter } from './api/tree-snapshot-mock.adapter';
import { AudioAssetHttpAdapter } from './api/audio-asset-http.adapter';
import { AudioAssetMockAdapter } from './api/audio-asset-mock.adapter';
import { UsageSignalHttpAdapter } from './api/usage-signal-http.adapter';
import { UsageSignalMockAdapter } from './api/usage-signal-mock.adapter';

export type ConvAdapterMode = 'http' | 'mock';

export interface ConvProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — conv-service is published (BE M1.5); use mock only under explicit override.
   * Carry-forward: scaffold:mock-adapter-default:shell-provider-not-switched-to-http
   */
  adapter?: ConvAdapterMode;
}

/**
 * Returns the CONV module's DI providers.
 * Use in `app.config.ts` or the Patient-Mode host's `ApplicationConfig`:
 *
 * ```ts
 * provideConv()                     // http (default) — conv-service must be reachable
 * provideConv({ adapter: 'mock' }) // mock — dev / e2e / Storybook only
 * ```
 *
 * The NAVIGATION_INTENT_PORT default is always NoOpNavigationIntentPort.
 * The Patient-Mode host overrides it with the GEST-fed implementation when both modules
 * are co-mounted (INT-FE-CONV-1 / ADR-007).
 */
export function provideConv(config: ConvProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';

  const sharedProviders: Provider[] = [
    { provide: NAVIGATION_INTENT_PORT, useClass: NoOpNavigationIntentPort },
  ];

  if (mode === 'mock') {
    return [
      ...sharedProviders,
      { provide: TREE_SNAPSHOT_PORT,  useClass: TreeSnapshotMockAdapter },
      { provide: AUDIO_ASSET_PORT,    useClass: AudioAssetMockAdapter },
      { provide: USAGE_SIGNAL_PORT,   useClass: UsageSignalMockAdapter },
    ];
  }

  return [
    ...sharedProviders,
    { provide: TREE_SNAPSHOT_PORT,  useClass: TreeSnapshotHttpAdapter },
    { provide: AUDIO_ASSET_PORT,    useClass: AudioAssetHttpAdapter },
    { provide: USAGE_SIGNAL_PORT,   useClass: UsageSignalHttpAdapter },
  ];
}
