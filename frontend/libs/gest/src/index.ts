// @neuroassist/gest — public API
// Import path: @neuroassist/gest (see frontend/tsconfig.base.json)

// Routes
export { GEST_ROUTES } from './lib/gest.routes';

// Providers
export { provideGest } from './lib/gest.providers';
export type { GestAdapterMode, GestProviderConfig } from './lib/gest.providers';

// Facades (public, for host-level consumers)
export { RuntimeFacade } from './lib/runtime.facade';
export type {
  StationRuntimeVM,
  RecognitionVM,
  CameraState,
  ModelState,
  DetectionState,
} from './lib/runtime.facade';

export { CatalogFacade } from './lib/catalog.facade';
export type { ActiveCommandVM } from './lib/catalog.facade';

export { ReportFacade } from './lib/report.facade';
export type { ReportQueueVM, ReportQueueItemVM, ReportItemStatus } from './lib/report.facade';

// Ports (re-exported for host-level injection / testing)
export { GESTURE_REPORT_PORT } from './lib/api/gesture-report.port';
export type { GestureReportPort, GestureReportWire, EventWire } from './lib/api/gesture-report.port';

export { CAPABILITY_SUPPORT_PORT } from './lib/api/capability-support.port';
export type {
  CapabilitySupportPort,
  SupportCheckRequestWire,
  SupportCheckResultWire,
  GestEngineWire,
  SupportStatus,
} from './lib/api/capability-support.port';

export { CATALOG_PORT } from './lib/api/catalog.port';
export type { CatalogPort, EdgeCatalogWire, CatalogCommandWire } from './lib/api/catalog.port';

// EDGE seam — StationLivenessPort
export { STATION_LIVENESS_PORT } from './lib/integration/station-liveness.port';
export type {
  StationLivenessPort,
  DetectionStateEnum,
  DetectionReason,
} from './lib/integration/station-liveness.port';
export { NoOpStationLivenessPort } from './lib/integration/no-op-station-liveness.port';

// Module descriptor
export { GEST_MODULE_DESCRIPTOR, MODULE_PERMISSION_MAP, MODULE_KEY } from './lib/gest.descriptor';
export type { GestModuleDescriptor } from './lib/gest.descriptor';
