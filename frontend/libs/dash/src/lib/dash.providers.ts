import { Provider } from '@angular/core';
import { DashboardFacade } from './dash.facade';
import { DashShellIntegrationService } from './integration/dash-shell-integration.service';
import { DetectionLapseAdapter } from './integration/detection-lapse.adapter';

// DASH has NO Port/Adapter for HTTP (BE ADR-001 — no dash-service at MVP).
// NO HttpClient, NO ${ACCESS_HTTP_BASE}/dash, NO /api/v1/dash.
// provideDash() registers the composition layer's core services.
// The composed modules (HIST, EVNT, EDGE, PAT) are provided by their own provideXxx() calls
// in app.config.ts — DASH does NOT re-provide them.

export type DashAdapterMode = 'composition'; // only valid mode: DASH has no backend

export interface DashProviderConfig {
  /**
   * Reserved for future use when dash-service (ADR-001 revisit trigger) is confirmed.
   * No adapter switching exists today — DASH is always a composition host.
   */
  _reserved?: never;
}

/**
 * Returns the DASH module's DI providers.
 * Use in `app.config.ts` or the shell's `ApplicationConfig`:
 *
 * ```ts
 * ...provideDash()
 * ```
 *
 * DASH composes HIST/EVNT/EDGE/PAT; ensure provideHist(), provideEvnt(),
 * provideEdge() and providePat() are also registered (already done in app.config.ts).
 */
export function provideDash(_config: DashProviderConfig = {}): Provider[] {
  return [
    // DashboardFacade is providedIn: 'root' — listed here for discoverability.
    // DashShellIntegrationService is providedIn: 'root'.
    // DetectionLapseAdapter is providedIn: 'root'.
    // No token overrides: DASH has no Port to swap.
    DashboardFacade,
    DashShellIntegrationService,
    DetectionLapseAdapter,
  ];
}
