// @neuroassist/pat — public API
// Import path: @neuroassist/pat (see frontend/tsconfig.base.json)

export { PAT_ROUTES } from './lib/pat.routes';
export { providePat } from './lib/pat.providers';
export type { PatAdapterMode, PatProviderConfig } from './lib/pat.providers';
export { PatientFacade } from './lib/patient.facade';
export type { PatientRow } from './lib/patient.facade';
export { CommandFacade } from './lib/command.facade';
export type { CommandRow } from './lib/command.facade';
export { GestureTypeFacade } from './lib/gesture-type.facade';
export type { GestureTypeRow } from './lib/gesture-type.facade';
// Ports (re-exported for use by host-level guards/consumers)
export { PATIENT_PORT } from './lib/api/patient.port';
export { COMMAND_PORT } from './lib/api/command.port';
export { GESTURE_TYPE_PORT } from './lib/api/gesture-type.port';
