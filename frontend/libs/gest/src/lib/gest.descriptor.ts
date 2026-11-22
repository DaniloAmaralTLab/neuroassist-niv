// GEST module descriptor — SPEC-06 §1 / SPEC-05.
// Consumed by the Patient-Mode host to register GEST's routes + metadata.
//
// MODULE_PERMISSION_MAP is EMPTY — GEST has no caregiver authority-gated affordance (SPEC-05 §2).
// The module is gated by the station identity (edge.device token), NOT a caregiver JWT.
// GEST contributes NO caregiver sidebar top-level destination.

/** Keys of caregiver-authority-gated affordances in this module. EMPTY in v1. */
export const MODULE_PERMISSION_MAP: Record<string, never> = {};

export const MODULE_KEY = 'gest' as const;

export interface GestModuleDescriptor {
  key: typeof MODULE_KEY;
  label: string;
  icon: string;
  /** Patient-Mode station context (NOT the caregiver sidebar section). */
  section: 'station';
  /**
   * Caregiver permissions this module contributes. Empty in v1.
   * When a future caregiver-facing GEST screen is added, use gest.capability.read
   * or gest.engine.read (D-639, never gest.*.view).
   */
  permissions: string[];
  /** Station token authorities the edge.device token MUST carry (INT-GEST-ACS-1). */
  stationTokenAuthorities: string[];
  routeBase: '/station';
  /**
   * This module is gated by the station identity — the Patient-Mode host must wire
   * the device-token interceptor (not the caregiver bearer) for GEST's egress.
   */
  identity: 'edge.device';
}

export const GEST_MODULE_DESCRIPTOR: GestModuleDescriptor = {
  key: MODULE_KEY,
  label: 'Station Detection',
  icon: 'sensors',
  section: 'station',
  permissions: Object.keys(MODULE_PERMISSION_MAP),  // [] in v1
  stationTokenAuthorities: [
    'evnt.event.ingest',
    'gest.capability.read',
    'gest.engine.read',
    'edge.catalog.read',
    'edge.heartbeat.record',
  ],
  routeBase: '/station',
  identity: 'edge.device',
};
