// @neuroassist/acs — public API
// Import path: @neuroassist/acs (see frontend/tsconfig.base.json)

export { ACS_ROUTES, ACS_OPS_ROUTES } from './lib/acs.routes';
export { provideAcs } from './lib/acs.providers';
export type { AcsAdapterMode, AcsProviderConfig } from './lib/acs.providers';
export { CaregiverFacade } from './lib/caregiver.facade';
export type { CaregiverRow } from './lib/caregiver.facade';
export { PatientSessionFacade } from './lib/patient-session.facade';
export type { PatientSessionRow } from './lib/patient-session.facade';
export { TenantAdminFacade } from './lib/tenant-admin.facade';
export type { TenantRow } from './lib/tenant-admin.facade';
// Ports (re-exported for use by host-level guards/consumers)
export { CAREGIVER_PORT } from './lib/api/caregiver.port';
export { PATIENT_SESSION_PORT } from './lib/api/patient-session.port';
export { TENANT_ADMIN_PORT } from './lib/api/tenant-admin.port';
