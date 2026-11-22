import { Provider } from '@angular/core';
import { PATIENT_PORT } from './api/patient.port';
import { COMMAND_PORT } from './api/command.port';
import { GESTURE_TYPE_PORT } from './api/gesture-type.port';
import { PatientHttpAdapter } from './api/patient-http.adapter';
import { PatientMockAdapter } from './api/patient-mock.adapter';
import { CommandHttpAdapter } from './api/command-http.adapter';
import { CommandMockAdapter } from './api/command-mock.adapter';
import { GestureTypeHttpAdapter } from './api/gesture-type-http.adapter';
import { GestureTypeMockAdapter } from './api/gesture-type-mock.adapter';

export type PatAdapterMode = 'http' | 'mock';

export interface PatProviderConfig {
  /**
   * Adapter mode.
   * Default: 'http' — pat-service exists (carry-forward: scaffold:mock-adapter-default:shell-provider-not-switched-to-http).
   * Pass 'mock' only under explicit dev/Storybook override.
   */
  adapter?: PatAdapterMode;
}

/**
 * Returns the PAT module's DI providers.
 * Usage in app.config.ts:
 *
 * ```ts
 * providePat()                        // http (default — pat-service exists)
 * providePat({ adapter: 'mock' })     // mock — dev / Storybook only
 * ```
 */
export function providePat(config: PatProviderConfig = {}): Provider[] {
  const mode = config.adapter ?? 'http';

  if (mode === 'mock') {
    return [
      { provide: PATIENT_PORT, useClass: PatientMockAdapter },
      { provide: COMMAND_PORT, useClass: CommandMockAdapter },
      { provide: GESTURE_TYPE_PORT, useClass: GestureTypeMockAdapter },
    ];
  }

  return [
    { provide: PATIENT_PORT, useClass: PatientHttpAdapter },
    { provide: COMMAND_PORT, useClass: CommandHttpAdapter },
    { provide: GESTURE_TYPE_PORT, useClass: GestureTypeHttpAdapter },
  ];
}
