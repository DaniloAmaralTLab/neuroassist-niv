// EVNT module public API
// All types and tokens consumed by the shell or other modules must be exported here.
// Internal implementation details (adapters, feature components) are NOT exported.

// Routes
export { EVNT_ROUTES } from './lib/evnt.routes';

// Providers factory
export { provideEvnt } from './lib/evnt.providers';
export type { EvntProviderConfig, EvntAdapterMode } from './lib/evnt.providers';

// Facades (injected by shell and by integration tests)
export { AlarmFacade } from './lib/alarm.facade';
export type {
  AlarmState,
  PollingState,
  AlarmVM,
  AcknowledgedVM,
  MonitoringVM,
  RoutineNoticeVM,
} from './lib/alarm.facade';

export { PushChannelFacade } from './lib/push-channel.facade';
export type { PushChannelVM, PushPermission, PhoneChannelState } from './lib/push-channel.facade';

// Shell surface components (topbar + home slot)
export { RoutineNoticeIndicatorComponent } from './lib/feature-notifications/routine-notice-indicator.component';
export { RoutineNoticeListComponent } from './lib/feature-notifications/routine-notice-list.component';

// Ports (for test overrides and integration consumers)
export { EVENT_PORT } from './lib/api/event.port';
export type { EventPort } from './lib/api/event.port';
export { PUSH_SUBSCRIPTION_PORT } from './lib/api/push-subscription.port';
export type { PushSubscriptionPort } from './lib/api/push-subscription.port';
