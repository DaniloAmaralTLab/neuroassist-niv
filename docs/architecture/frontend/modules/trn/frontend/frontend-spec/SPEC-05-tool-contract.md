# SPEC-05 — Module Contract — trn (TRN) Frontend

> Content of `libs/trn/src/lib/trn.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. The permission map holds the **twelve caregiver
> authorities** TRN runs under, each equal to the BE authority constant (BE api-contract §10; data-model
> §4.1; permission-catalogue `trn` module, D-639). There is **no** patient-session authority — TRN runs
> under one caregiver identity (SPEC-01 §2; ADR-005 amendment). Code fences are illustration, not EARS
> contracts.

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'trn';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'trn',
  title: 'Training',
  icon: 'school',                  // Material Symbols (self-hosted @font-face)
  section: 'care',                 // the caregiver web Shell (beside DASH), not a patient surface
  order: 40,
  identity: 'caregiver.jwt',       // runs under the ACS caregiver JWT — the ONLY TRN identity
  entries: [
    { label: 'Training', route: '/training', requires: 'trn.session.read' },
  ],
};
```

## 2. `MODULE_PERMISSION_MAP` — caregiver authorities only (verbatim from BE)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'trn.session.create':     { label: 'Open a training session', justification: 'Gate "Start session" (POST /trn/sessions). BE api-contract §2.1.' },
  'trn.session.read':       { label: 'Read a training session', justification: 'Gate the /training surface + session reads (GET /trn/sessions/{id}). BE §2.2.' },
  'trn.proposal.read':      { label: 'Read a proposal',         justification: 'Gate reading a proposal and its authorization value object (GET .../proposals/{pid}). BE §3.2.' },
  'trn.proposal.update':    { label: 'Refine a proposal',       justification: 'Gate the assistant dialog turn and the human edit/withdrawal (POST .../dialog, PATCH proposal, POST .../withdrawal). BE §3.1/§3.3/§4.4.' },
  'trn.proposal.approve':   { label: 'Approve / attest assent', justification: 'Gate the caregiver confirmation AND the in-session patient/guardian assent fact (POST .../caregiver-confirmation, POST .../patient-assent). BE §4.1/§4.2 — both halves are attested under the caregiver authority (ADR-002).' },
  'trn.proposal.reject':    { label: 'Reject a proposal',       justification: 'Gate rejecting a non-terminal proposal (POST .../rejection). BE §4.3.' },
  'trn.publication.create': { label: 'Publish an approved node', justification: 'Gate requesting synthesize+index+publish of an approved proposal (POST .../publication). BE §6.1.' },
  'trn.publication.read':   { label: 'Read publication status', justification: 'Gate reading the publish lifecycle status (GET /trn/publications/{id}). BE §6.2.' },
  'trn.consent.create':     { label: 'Capture voice consent',   justification: 'Gate capturing patient + representative voice-cloning consent (POST /trn/consents). BE §5.1.' },
  'trn.consent.read':       { label: 'Read voice consent',      justification: 'Gate reading the patient consent gate state (GET /trn/patients/{id}/consent). BE §5.2.' },
  'trn.consent.revoke':     { label: 'Revoke voice consent',    justification: 'Gate revoking consent (POST /trn/consents/{id}/revocation). BE §5.3.' },
  'trn.content.delete':     { label: 'Erase voice content',     justification: 'Gate the right-to-be-forgotten erasure (DELETE /trn/patients/{id}/content). BE §7.1.' },
};
```

> **There is no `trn.proposal.confirm` and no patient-session authority.** ACS INV-3 keeps the
> patient-session token to `conv.*`/`gest.*`; the patient/guardian assent is attested under the caregiver
> `trn.proposal.approve` authority as an in-session domain fact (ADR-002; SPEC-01 §2). The twelve keys
> above are the **entire** TRN UI permission map. The **outbound** service-client authorities
> (`conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`, `hist.audit.record`,
> `pat.patient.read`) are held by `trn-service` **server-side** (integration-contracts §4, INT-TRN-1) and
> are **not** FE UI authorities.

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'trn.switch-scan.enabled':    { defaultState: true,  justification: 'Switch-scan input channel (dwell + timed scan) on the assisted patient-assent surface for patients who drive by a single switch. Off → only touch and gesture channels. Timing is host/profile-configurable (ADR-007, reused from CONV).' },
  'trn.audio-preview.enabled':  { defaultState: true,  justification: 'Caregiver audio preview of a proposal. Resolves BE-served clip → device TTS → large text (SPEC-07 §3). Off → no preview affordance. No pre-publication clip endpoint exists in v1 (INT-FE-TRN-1), so preview degrades to device TTS/text until one lands.' },
};
```

`provideTrn({ adapter, flags })` wires the Http/Mock adapters (**default `'http'`** — trn-service is
specified, SPEC-04 §2) and the `NAVIGATION_INTENT_PORT` default `NoOpNavigationIntentPort` (used only if
the assent surface is later mounted in a Patient-Mode host; the caregiver surface needs no host override).

## 4. RBAC-of-UI rule (caregiver self-gating)

- The whole `/training` surface requires `trn.session.read` (menu entry `requires` + guard).
- **Approve** and **Capture patient assent** affordances require `trn.proposal.approve`; lacking it, both
  are **disabled** (the proposal cannot cross either half of the gate).
- **Reject** requires `trn.proposal.reject`; **Edit** and the dialog turn require `trn.proposal.update`.
- **Publish** requires `trn.publication.create`; lacking it, the Publish affordance is **hidden**.
- **Capture / revoke consent** require `trn.consent.create` / `trn.consent.revoke`; the consent gate read
  requires `trn.consent.read`.
- **Erase** requires `trn.content.delete`; lacking it, the erase affordance is **hidden**.
- Every authority-gated affordance goes through the `caregiverAuthoringGuard` / an `access-decision`
  can-check (a Wave-0 stub today — SPEC-01 §4); it **never** hardcodes `return true` (carry-forward
  `guard:stub-permissive`).

## Acceptance criteria (EARS)

- WHILE the caregiver session lacks `trn.proposal.approve`, THE SYSTEM SHALL disable the approve and the capture-patient-assent affordances.
- WHILE the caregiver session lacks `trn.publication.create`, THE SYSTEM SHALL hide the publish affordance.
- WHILE the caregiver session lacks `trn.content.delete`, THE SYSTEM SHALL hide the erase affordance.
- THE SYSTEM SHALL build the TRN permission map only from the twelve caregiver authorities and SHALL NOT introduce a `trn.proposal.confirm` or any patient-session authority.
- THE SYSTEM SHALL expose no vendor affordance for Claude or ElevenLabs because those are reached only through trn-service.
- THE SYSTEM SHALL evaluate every TRN surface gate through the caregiver authoring guard and SHALL NOT return a hardcoded true from a guard.
