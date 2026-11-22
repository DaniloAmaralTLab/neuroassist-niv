// HIST module contract — BE-canonical authorities (D-639, BE api-contract §2/§3).
// Permission keys equal the BE authority constants — reads are `.read`, never `.view`.
// HIST exposes READ-ONLY authorities only (ADR-005, SPEC-05).

export const MODULE_KEY = 'hist';

// ── Menu metadata ─────────────────────────────────────────────────────────────

export interface ModuleMenuEntry {
  label: string;
  route: string;
  requires: string;
}

export interface ModuleMenuMetadata {
  key: string;
  title: string;
  icon: string;
  section: string;
  order: number;
  entries: ModuleMenuEntry[];
}

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'hist',
  title: 'History',
  icon: 'history',                // Material Symbols
  section: 'care',
  order: 40,
  entries: [
    { label: 'History', route: '/history', requires: 'hist.history.read' },
  ],
};

// ── Permission map (caregiver authorities only — BE-canonical, D-639) ────────
// Only ONE caregiver authority: hist.history.read.
// hist.audit.read = operator full trail (BE §3) — NEVER a caregiver guard (`hist-audit-read-operator-only`).
// hist.audit.record = producer service-client ingest (BE §1) — NEVER a caregiver key.
// hist.erasure.create = operator/service-client (BE §4) — NEVER a caregiver key.

export interface PermissionMapEntry {
  label: string;
  justification: string;
}
export type ModulePermissionMap = Record<string, PermissionMapEntry>;

export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'hist.history.read': {
    label: 'Read patient history',
    justification: 'Read the per-patient immutable timeline (events, confirmations, feedback outcomes, escalation attempts and detection lapses) for a linked patient — CAREGIVER + CLINIC_COORDINATOR (BE api-contract §2; link/tenant scope enforced server-side).',
  },
};

// ── Feature flags ─────────────────────────────────────────────────────────────

export interface FeatureFlagEntry {
  defaultState: boolean;
  justification: string;
}
export type ModuleFeatureFlags = Record<string, FeatureFlagEntry>;

export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'hist.escalation-trail': {
    defaultState: true,
    justification: 'Show the SAFETY-GEST-1 escalation & detection-lapse section on /history (fed by the same hist.history.read read). Off → only the proven event history ships; the timeline is unaffected (doc 01 §4, doc 06 R4).',
  },
  'hist.audit-console': {
    defaultState: false,
    justification: 'Future operator/admin audit console over GET /hist/audit (hist.audit.read). OFF by default and un-routed for the caregiver MVP (SPEC-01 §4, doc 06 G2/Q2); shipping it is a separate admin-surface decision.',
  },
};
