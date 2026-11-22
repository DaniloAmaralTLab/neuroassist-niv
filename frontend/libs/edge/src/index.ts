// @neuroassist/edge — public API
// Import path: @neuroassist/edge (see frontend/tsconfig.base.json)

export { EDGE_ROUTES } from './lib/edge.routes';
export { provideEdge } from './lib/edge.providers';
export type { EdgeAdapterMode, EdgeProviderConfig } from './lib/edge.providers';
export { DeviceFacade } from './lib/device.facade';
export type {
  EdgeDeviceVM,
  DeviceStatusVM,
  DevicePairingVM,
  DeviceLifecycleVM,
  DeviceConnectivity,
  DeviceLifecycleState,
} from './lib/device.facade';
// Ports (re-exported for use by host-level guards/consumers)
export { EDGE_DEVICE_PORT } from './lib/api/edge-device.port';
export type {
  EdgeDeviceWire,
  EdgeDeviceRowWire,
  EnrollResultWire,
  EdgeLifecycleState,
  EdgeConnectivity,
} from './lib/api/edge-device.port';
// Presentational components for Shell embedding
export { DeviceStatusBadgeComponent } from './lib/ui/device-status-badge.component';
export { EdgeDeviceCardComponent } from './lib/feature-device-status/edge-device-card.component';
export { DevicePairingPanelComponent } from './lib/feature-device-pairing/device-pairing-panel.component';
