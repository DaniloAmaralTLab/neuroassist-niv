// Module registry consumed by the sidebar and the shell route loader.
// Added progressively via /fe-architect-promote of each module.
// Source of truth for route and permission metadata (SPEC-01, SPEC-06).

export interface ModuleDescriptor {
  key: string;
  label: string;
  icon: string;             // Material Symbols name
  route: string;            // absolute path, starts with /
  section: 'main' | 'admin';
  requiredPermission: string;
}

// ACS — Caregivers and Access (promoted by /fe-architect-promote neuroassist-niv ACS)
export const ACS_DESCRIPTOR: ModuleDescriptor = {
  key: 'ACS',
  label: 'Access',
  icon: 'group',
  route: '/access',
  section: 'admin',
  requiredPermission: 'acs.caregiver.create',
};

// PAT — Patients and Command Catalog (promoted by /fe-architect-promote neuroassist-niv PAT)
export const PAT_DESCRIPTOR: ModuleDescriptor = {
  key: 'PAT',
  label: 'Patients',
  icon: 'person',
  route: '/patients',
  section: 'main',
  requiredPermission: 'pat.command.read',
};

// EDGE — Edge Device Integration (promoted by /fe-architect-promote neuroassist-niv EDGE)
// EDGE contributes NO standalone top-level sidebar destination (SPEC-05 §1 — contextual, patient-scoped).
// The DeviceStatusBadge is always visible in the topbar via Shell contribution; routes are reached
// through the Home card, the onboarding wizard step 3, and the patient-phone activation screen.
export const EDGE_DESCRIPTOR: ModuleDescriptor = {
  key: 'EDGE',
  label: 'Edge Device',
  icon: 'router',                          // Material Symbols
  route: '/patients/:patientId/device',    // contextual, patient-scoped (not a sidebar top-level)
  section: 'main',
  requiredPermission: 'edge.device.read',  // BE-canonical (INV-EDGE-7, G-EDGE-1)
};

// EVNT — Events and Alarm (promoted by /fe-architect-promote neuroassist-niv EVNT)
// EVNT has NO standalone top-level sidebar destination (SPEC-01 §1 — /alarm is a full-screen takeover,
// reached via the EvntShellIntegrationService auto-navigate, not from the sidebar).
// The shell surfaces are:
//   - topbar: RoutineNoticeIndicatorComponent (bell icon + unseen count) — SPEC-02 §3.2.E
//   - home slot: RoutineNoticeListComponent (discreet routine notice cards) — SPEC-02 §2
//   - overlay: EvntShellIntegrationService auto-navigates to /alarm on active emergency — SPEC-06 §3
export const EVNT_DESCRIPTOR: ModuleDescriptor = {
  key: 'EVNT',
  label: 'Events & Alarms',
  icon: 'emergency_home',
  route: '/alarm',
  section: 'main',
  requiredPermission: 'evnt.event.read',
};

// GEST — Station Detection (promoted by /fe-architect-promote neuroassist-niv GEST)
// GEST has NO caregiver sidebar top-level destination — it is the patient station runtime,
// gated by the station identity (edge.device), not a caregiver JWT.
// MODULE_PERMISSION_MAP is EMPTY: no caregiver authority-gated affordance in v1 (SPEC-05 §2).
// When a future caregiver GEST screen is added, use gest.capability.read / gest.engine.read (D-639).
// The Patient-Mode host that co-mounts GEST + libs/edge must override STATION_LIVENESS_PORT
// with libs/edge's concrete StationLivenessService (SAFETY-GEST-1, SPEC-06 §2.1).
export const GEST_DESCRIPTOR: ModuleDescriptor = {
  key: 'GEST',
  label: 'Station Detection',
  icon: 'sensors',
  route: '/station/status',       // the only navigable surface; runtime is near-headless
  section: 'main',
  requiredPermission: '',         // empty: no caregiver permission required (station identity only)
};

// HIST — History and Audit Trail (promoted by /fe-architect-promote neuroassist-niv HIST)
// HIST contributes a standalone /history destination in the 'care' section (SPEC-05 §1 / SPEC-06 §1).
// The fallback descriptor allows the sidebar to show History before the lazy chunk resolves.
export const HIST_DESCRIPTOR: ModuleDescriptor = {
  key: 'hist',
  label: 'History',
  icon: 'history',                   // Material Symbols
  route: '/history',
  section: 'main',
  requiredPermission: 'hist.history.read',  // BE-canonical (D-639, `hist-authority-exact`)
};

// DASH — Dashboard and Notifications (promoted by /fe-architect-promote neuroassist-niv DASH)
// DASH is the shell HOME — it always renders at /home and is the default landing after login.
// Permissions: DASH has no dash.* authority (BE ADR-001 — no backend service at MVP).
// Authority union exposed via the overview: hist.history.read + evnt.event.read +
//   evnt.detection-lapse.read + edge.device.read + pat.command.read (SPEC-05 §2).
export const DASH_DESCRIPTOR: ModuleDescriptor = {
  key: 'DASH',
  label: 'Home',
  icon: 'dashboard',
  route: '/home',
  section: 'main',
  requiredPermission: 'evnt.event.read',  // representative authority; self-gates per panel
};

// Modules added progressively via /fe-architect-promote of each module.
export const MODULE_DESCRIPTORS: ModuleDescriptor[] = [
  DASH_DESCRIPTOR,   // first: DASH is the home (order: 0)
  ACS_DESCRIPTOR,
  PAT_DESCRIPTOR,
  EDGE_DESCRIPTOR,
  EVNT_DESCRIPTOR,
  HIST_DESCRIPTOR,
  // GEST is NOT added to the caregiver sidebar — station-only module; listed here for reference only
];
