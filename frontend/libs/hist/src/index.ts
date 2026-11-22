// @neuroassist/hist — public API
// All types and tokens consumed by the shell or other modules must be exported here.
// Internal implementation details (adapters, feature components) are NOT exported.

// Routes
export { HIST_ROUTES } from './lib/hist.routes';

// Providers factory
export { provideHist } from './lib/hist.providers';
export type { HistProviderConfig, HistAdapterMode } from './lib/hist.providers';

// Facade (injected by shell and integration tests)
export { HistoryFacade } from './lib/hist.facade';
export type {
  HistoryEntryVM,
  HistoryEntryKind,
  HistoryViewState,
  PeriodSummaryVM,
} from './lib/hist.facade';

// Module contract (menu metadata, permission map, feature flags)
export { MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS } from './lib/hist.contract';

// Shell integration (DASH/Home widget embedding — SPEC-06 §4)
export { HistShellIntegrationService } from './lib/integration/hist-shell-integration.service';

// History widget for DASH embedding (SPEC-06 §4) — read-only, gated by hist.history.read
export { HistoryWidgetComponent } from './lib/feature-history/history-widget.component';

// Port + token (for test overrides and integration consumers)
export { HISTORY_PORT } from './lib/api/history.port';
export type { HistoryPort, HistoryPageWire, HistoryEntryWire, PeriodFilter } from './lib/api/history.port';
