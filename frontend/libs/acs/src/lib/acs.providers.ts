import { Provider } from '@angular/core';
import { CAREGIVER_PORT } from './api/caregiver.port';
import { PATIENT_SESSION_PORT } from './api/patient-session.port';
import { TENANT_ADMIN_PORT } from './api/tenant-admin.port';
import { CaregiverHttpAdapter } from './api/caregiver-http.adapter';
import { CaregiverMockAdapter } from './api/caregiver-mock.adapter';
import { PatientSessionHttpAdapter } from './api/patient-session-http.adapter';
import { PatientSessionMockAdapter } from './api/patient-session-mock.adapter';
import { TenantAdminHttpAdapter } from './api/tenant-admin-http.adapter';
import { TenantAdminMockAdapter } from './api/tenant-admin-mock.adapter';

export type AcsAdapterMode = 'http' | 'mock';

export interface AcsProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — acs-service exists; use mock only under explicit override.
   * Carry-forward: scaffold:mock-adapter-default:shell-provider-not-switched-to-http
   */
  adapter?: AcsAdapterMode;
}

/**
 * Returns the ACS module's DI providers.
 * Use in `app.config.ts` or the shell's `ApplicationConfig`:
 *
 * ```ts
 * provideAcs()                        // http (default)
 * provideAcs({ adapter: 'mock' })     // mock — dev / Storybook only
 * ```
 */
export function provideAcs(config: AcsProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';

  if (mode === 'mock') {
    return [
      { provide: CAREGIVER_PORT, useClass: CaregiverMockAdapter },
      { provide: PATIENT_SESSION_PORT, useClass: PatientSessionMockAdapter },
      { provide: TENANT_ADMIN_PORT, useClass: TenantAdminMockAdapter },
    ];
  }

  return [
    { provide: CAREGIVER_PORT, useClass: CaregiverHttpAdapter },
    { provide: PATIENT_SESSION_PORT, useClass: PatientSessionHttpAdapter },
    { provide: TENANT_ADMIN_PORT, useClass: TenantAdminHttpAdapter },
  ];
}
