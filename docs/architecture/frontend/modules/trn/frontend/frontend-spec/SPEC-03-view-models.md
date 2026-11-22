# SPEC-03 — View Models — trn (TRN) Frontend

> The view-models the TRN facades expose as `computed` signals, plus the state invariants of a
> collaborative, server-authoritative authoring tool (FE `adr/ADR-005`/`ADR-007`; invariants declared
> once in `frontend/03-domain-framing-frontend.md` §5). The proposal lifecycle mirrors the **BE
> canonical states** verbatim (BE `data-model.md` §2.2, `api-contract.md` §3–§6). Code fences are
> illustration. Invariant ids are **cited, not redeclared** (ADR-007 of candeeiro-so).

## 1. View-models (record shapes with Signals)

```ts
export type ProposalState =
  | 'draft' | 'proposed'
  | 'caregiver_approved' | 'patient_approved' | 'approved'
  | 'synthesizing' | 'indexed' | 'published'
  | 'rejected' | 'withdrawn' | 'erased';          // verbatim from BE data-model §2.2

export interface ProposalVM {
  proposalId: string;
  type: 'category' | 'phrase';
  parentRef: string | null;
  label: string | null;                           // category label (BE proposal.label)
  text: string | null;                            // phrase text (BE proposal.text)
  state: ProposalState;
  caregiverConfirmed: boolean;                    // derived: authorization.caregiver_confirmed_at != null
  patientConfirmed: boolean;                       // derived: authorization.patient_confirmed_at != null
  dualAuthorized: boolean;                          // derived: state in {approved,synthesizing,indexed,published}
  patientAssent: { confirmedBy: string; method: string; relationship: string | null } | null;
  previewSource: 'be-clip' | 'tts-fallback' | 'text-only' | null;   // resolved per preview call
  adjustOptions: string[];                          // short service-supplied variations; EMPTY in v1 (no BE endpoint — SPEC-04 §5)
}

export interface TrainingScreenVM {               // Screen 08 — caregiver
  sessionId: string | null;
  sessionState: 'empty' | 'active' | 'loading' | 'error' | 'ended-pending';
  messages: ChatTurn[];                            // { role: 'caregiver' | 'assistant', text }
  llmState: 'idle' | 'responding' | 'error';       // the LLM dialog turn state (503 llm-unavailable → 'error')
  proposals: ProposalVM[];                          // draft/proposed/caregiver_approved nodes of the active session
  consentState: 'unknown' | 'granted' | 'missing' | 'revoked';   // the consent gate (BE §5)
}

export interface PatientAssentScreenVM {           // Screen 09 — assisted, caregiver session
  pending: ProposalVM[];                            // state === 'caregiver_approved' (caregiver half present, patient half absent)
  activeChannel: 'touch' | 'gesture' | 'switch-scan';
  recordState: 'idle' | 'recording' | 'recorded' | 'error';
}

export interface ConsentVM {                        // the voice-cloning consent gate
  patientId: string;
  status: 'granted' | 'revoked' | 'none';
  grantedByPatient: boolean;
  grantedByRepresentative: boolean;
  representativeRef: string | null;
}

export interface PublicationVM {                    // lifecycle status surface (BE §6.2)
  publicationId: string;
  approvalId: string;
  status: 'pending' | 'published' | 'failed';       // 'pending' is rendered as "pending-synth"
  convVersionId: string | null;
  lastError: string | null;
}
```

## 2. Lifecycle-status axis (read-only, BE-owned)

The FE **reflects** the BE proposal `state` and publication `status`; it never infers them client-side.

| Surfaced status | BE source | What the caregiver sees |
|---|---|---|
| draft / proposed | `proposal.state` | the working proposal, dual-confirm indicator both ⏳ |
| caregiver-approved | `state = caregiver_approved` | caregiver ✓, patient ⏳ — eligible for the assent surface |
| patient-approved | `state = patient_approved` | patient ✓, caregiver ⏳ (rare order) |
| approved | `state = approved` | both ✓ — eligible for publication |
| pending-synth | `publication.status = pending` (or `state = synthesizing`) | "waiting on synthesis" — honest, not "published" |
| published | `state = published` / `publication.status = published` | "active in CONV" + `convVersionId` |
| rejected / withdrawn / erased | `proposal.state` | terminal badge; no further action |

`pending-synth` is a **state, not an error** (doc 05 §5): on an ElevenLabs delay the node stays
`pending`/`synthesizing`; the FE never shows `published` without a BE-confirmed completed synthesis.

## 3. Derived-state rules (cited invariants, doc 03 §5)

- **Server-authoritative truth.** `dualAuthorized`, `state` and publication `status` come **only** from
  `trn-service`; the FE never marks a node `published` from a single confirmation side (doc 03 §5,
  INV-TRN-1/INV-TRN-6).
- **Assent-pending filter.** The Screen 09 `pending` list holds **only** proposals in state
  `caregiver_approved` (caregiver half recorded, patient half absent) — the assent surface never offers a
  node that is not yet caregiver-approved, and never one already `approved`.
- **Distinct-actor assent.** The patient assent `confirmedBy` MUST differ from the caregiver who recorded
  the caregiver half (BE INV-TRN-1); the VM carries the caregiver subject so the surface can refuse a
  same-actor assent before egress.
- **Honest preview source.** `previewSource` reflects the resolved cascade (`be-clip` → `tts-fallback` →
  `text-only`); it is never reported as `be-clip` when no clip is available (SPEC-04 §5, SPEC-07 §3).
- **Adjust is not free text.** On Screen 09, `adjustOptions` are short service-supplied variations only;
  in v1 there is no BE variation endpoint, so Adjust routes to a **caregiver refine** (PATCH) that
  re-enters re-approval (framing §5 Q2 default), never a patient free-text edit.
- **Drafts are never discarded.** Ending a session leaves `draft`/`proposed` proposals persisted
  (`sessionState = 'ended-pending'`); the FE issues no delete of a pending proposal on End session.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL derive the proposal `dualAuthorized`, `state` and publication `status` only from trn-service and SHALL NOT mark a node published from a single confirmation side.
- THE SYSTEM SHALL populate the patient-assent pending list only with proposals in the `caregiver_approved` state and SHALL NOT offer a proposal that is not yet caregiver-approved or already approved.
- WHILE the LLM dialog turn is in flight, THE SYSTEM SHALL show the responding state and SHALL NOT render a fabricated proposal.
- WHEN the training session is ended with pending proposals, THE SYSTEM SHALL persist those drafts as ended-pending and SHALL NOT discard a pending proposal.
- WHILE a publication is pending synthesis, THE SYSTEM SHALL render the pending-synth status and SHALL NOT render the proposal as published without a service-confirmed synthesis.
- THE SYSTEM SHALL resolve the audio preview source honestly across be-clip then tts-fallback then text-only and SHALL NOT report be-clip when no clip is available.
