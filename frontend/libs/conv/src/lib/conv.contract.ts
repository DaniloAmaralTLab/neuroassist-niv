// conv.contract.ts — Module contract for CONV (Conversation via Speech Tree).
// SPEC-05 §1–§4; permission-catalogue conv module (D-639).
// Patient-session authorities ONLY — TRN service-client authorities are NOT UI authorities.

export const MODULE_KEY = 'conv';

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
  identity: string;
  entries: ModuleMenuEntry[];
}

export interface PermissionDescriptor {
  label: string;
  justification: string;
}

export type ModulePermissionMap = Record<string, PermissionDescriptor>;

export interface FeatureFlagDescriptor {
  defaultState: boolean;
  justification: string;
}

export type ModuleFeatureFlags = Record<string, FeatureFlagDescriptor>;

/** Menu metadata for the Patient-Mode surface (section: 'patient', not the caregiver 'care' section). */
export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'conv',
  title: 'Talk',
  icon: 'chat_bubble',
  section: 'patient',
  order: 0,
  identity: 'patient.session',
  entries: [
    { label: 'Talk', route: '/patient/converse', requires: 'conv.tree.read' },
  ],
};

/**
 * Patient-session authorities ONLY (verbatim from BE api-contract §10 — D-639).
 * conv.tree.publish / conv.tree-version.retire / conv.audio.delete are TRN service-client
 * authorities: CONV renders NO surface for them (SPEC-05 §2).
 */
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'conv.tree.read': {
    label: 'Read the speech tree',
    justification: 'Gate the whole /patient/converse surface and the background tree sync (GET /conv/tree). In the patient-session token (ACS INV-3). BE api-contract §2.',
  },
  'conv.audio.read': {
    label: 'Read cached audio',
    justification: 'Gate audio prefetch and cached-clip fetch (GET /conv/audio/{assetId}). Without it, playback falls back to device TTS then large text. BE api-contract §3.',
  },
  'conv.usage.record': {
    label: 'Record opt-in usage',
    justification: 'Gate the opt-in minimal usage signal (POST /conv/usage-signals, phraseId + timestamp, no free text, INV-CONV-6). Off-path, never blocks playback. BE api-contract §4.',
  },
};

export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'conv.usage-signal.enabled': {
    defaultState: false,
    justification: 'Opt-in per BE INV-CONV-6 — OFF by default; the caregiver opts a patient in at provisioning. While off, no usage signal is enqueued or posted. Playback is unaffected either way.',
  },
  'conv.switch-scan.enabled': {
    defaultState: true,
    justification: 'Switch-scanning input channel (dwell + timed scan) for patients who drive the station by a single switch. Off → only touch and gesture channels are offered. Timing is host/profile-configurable (ADR-007).',
  },
};

/** Convenience alias for shell integration (SPEC-05 §1 / SPEC-06). */
export const CONV_MODULE_DESCRIPTOR = MODULE_MENU_METADATA;
