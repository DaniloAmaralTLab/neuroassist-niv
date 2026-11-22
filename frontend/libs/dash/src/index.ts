// @neuroassist/dash — public API
// All types and tokens consumed by the shell or other modules must be exported here.
// Internal implementation details are NOT exported.
//
// DASH has NO backend (BE ADR-001). No Port, no Adapter, no HttpClient.
// Compose from: @neuroassist/hist, @neuroassist/evnt, @neuroassist/edge, @neuroassist/pat.

// Routes
export { DASH_ROUTES } from './lib/dash.routes';

// Providers factory
export { provideDash } from './lib/dash.providers';
export type { DashProviderConfig, DashAdapterMode } from './lib/dash.providers';

// Facades
export { DashboardFacade } from './lib/dash.facade';

// Shell integration
export { DashShellIntegrationService } from './lib/integration/dash-shell-integration.service';

// Detection-lapse adapter seam (INT-FE-DASH-001)
export { DetectionLapseAdapter } from './lib/integration/detection-lapse.adapter';

// View-model types (consumed by shell and integration tests)
export type {
  OverviewVM,
  KpiVM,
  CatalogSummaryVM,
  SuggestionVM,
  SourceHealth,
  SourceKey,
  CompositeStatus,
} from './lib/dash.contract';

// Module contract (permission map, feature flags)
export {
  MODULE_KEY,
  MODULE_PERMISSION_MAP,
  MODULE_FEATURE_FLAGS,
  DASH_EDGE_HEARTBEAT_STALE_MS,
  DASH_HIST_SUMMARY_TTL_MS,
  DASH_PAT_TTL_MS,
  DASH_EVNT_FRESH_FACTOR,
} from './lib/dash.contract';
