// trn.contract.ts — Module contract for TRN (AI-Assisted Training / Speech Tree Authoring).
// SPEC-05 §1–§4; permission-catalogue trn module (D-639).
// Twelve caregiver authorities ONLY — no patient-session authority, no trn.proposal.confirm.
// Source of truth: BE api-contract §10.

export const MODULE_KEY = 'trn';

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

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'trn',
  title: 'Training',
  icon: 'school',          // Material Symbols (self-hosted @font-face)
  section: 'care',         // caregiver web shell (beside DASH), not a patient surface
  order: 40,
  identity: 'caregiver.jwt',  // runs under the ACS caregiver JWT — the ONLY TRN identity
  entries: [
    { label: 'Training', route: '/training', requires: 'trn.session.read' },
  ],
};

/**
 * Twelve caregiver authorities (verbatim from BE api-contract §10 — D-639).
 *
 * There is NO `trn.proposal.confirm` and NO patient-session authority.
 * ACS INV-3 keeps the patient-session token to conv.*/gest.*; the patient/guardian
 * assent is attested under the caregiver `trn.proposal.approve` authority as an
 * in-session domain fact (ADR-002, Option C; SPEC-01 §2).
 * Outbound service-client authorities (conv.tree.publish, hist.audit.record, etc.)
 * are held by trn-service server-side — not FE UI authorities.
 */
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'trn.session.create': {
    label: 'Open a training session',
    justification: 'Gate "Start session" (POST /trn/sessions). BE api-contract §2.1.',
  },
  'trn.session.read': {
    label: 'Read a training session',
    justification: 'Gate the /training surface + session reads (GET /trn/sessions/{id}). BE §2.2.',
  },
  'trn.proposal.read': {
    label: 'Read a proposal',
    justification: 'Gate reading a proposal and its authorization value object (GET .../proposals/{pid}). BE §3.2.',
  },
  'trn.proposal.update': {
    label: 'Refine a proposal',
    justification: 'Gate the assistant dialog turn and the human edit/withdrawal (POST .../dialog, PATCH proposal, POST .../withdrawal). BE §3.1/§3.3/§4.4.',
  },
  'trn.proposal.approve': {
    label: 'Approve / attest assent',
    justification: 'Gate the caregiver confirmation AND the in-session patient/guardian assent fact (POST .../caregiver-confirmation, POST .../patient-assent). BE §4.1/§4.2 — both halves are attested under the caregiver authority (ADR-002).',
  },
  'trn.proposal.reject': {
    label: 'Reject a proposal',
    justification: 'Gate rejecting a non-terminal proposal (POST .../rejection). BE §4.3.',
  },
  'trn.publication.create': {
    label: 'Publish an approved node',
    justification: 'Gate requesting synthesize+index+publish of an approved proposal (POST .../publication). BE §6.1.',
  },
  'trn.publication.read': {
    label: 'Read publication status',
    justification: 'Gate reading the publish lifecycle status (GET /trn/publications/{id}). BE §6.2.',
  },
  'trn.consent.create': {
    label: 'Capture voice consent',
    justification: 'Gate capturing patient + representative voice-cloning consent (POST /trn/consents). BE §5.1.',
  },
  'trn.consent.read': {
    label: 'Read voice consent',
    justification: 'Gate reading the patient consent gate state (GET /trn/patients/{id}/consent). BE §5.2.',
  },
  'trn.consent.revoke': {
    label: 'Revoke voice consent',
    justification: 'Gate revoking consent (POST /trn/consents/{id}/revocation). BE §5.3.',
  },
  'trn.content.delete': {
    label: 'Erase voice content',
    justification: 'Gate the right-to-be-forgotten erasure (DELETE /trn/patients/{id}/content). BE §7.1.',
  },
};

/**
 * Feature flags (SPEC-05 §3).
 * trn.audio-preview.enabled defaults to FALSE per orchestrator instruction
 * (no pre-publication preview endpoint in BE v1 — INT-FE-TRN-1; preview degrades to device TTS/text).
 */
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'trn.switch-scan.enabled': {
    defaultState: true,
    justification: 'Switch-scan input channel (dwell + timed scan) on the assisted patient-assent surface for patients who drive by a single switch. Off → only touch and gesture channels. Timing is host/profile-configurable (ADR-007, reused from CONV).',
  },
  'trn.audio-preview.enabled': {
    defaultState: false,
    justification: 'Caregiver audio preview of a proposal. No pre-publication clip endpoint exists in v1 (INT-FE-TRN-1); preview degrades to device TTS/large text until one lands. Default is OFF until the BE endpoint is published.',
  },
};

/** Convenience alias for shell integration (SPEC-05 §1 / SPEC-06). */
export const TRN_MODULE_DESCRIPTOR = MODULE_MENU_METADATA;
