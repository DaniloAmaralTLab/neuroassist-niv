# 03 — Domain Framing (Frontend) — trn (TRN)

> Mirror of the BE domain; do not redefine. Canonical terms live in `_brief.md` and the BE framing
> (M1.5, concurrent). This file captures the **client-side** view-models, events, state and invariants
> only. TRN authors content that CONV later speaks; the two share the `SpeechTreeNode` vocabulary.

## 1. Ubiquitous language (mirror)

- **SpeechTreeNode** — a node of the tree; `type ∈ { category, phrase }`; `parentId = null` ⇒ root.
  Carries `order`, `content` (per-locale map; only `en` authored, ADR-018), optional `engineFeatureRef`
  (maps a recognized gesture to a node), optional `audioRef` per locale (ElevenLabs clip, ADR-017).
- **Proposal** — a `SpeechTreeNode` in `status = draft`, created by the LLM/caregiver during a training
  session, awaiting Dual Authorization. A proposal is TRN's unit of work.
- **Dual Authorization** — `content.en.caregiverConfirmed` + `content.en.patientConfirmed`; a node is
  **published** (synthesized + ES-indexed + active in CONV) only when **both** are true (ADR-016).
- **Training session** — a bounded LLM conversation (Anthropic Claude, BE-mediated) in which the
  caregiver proposes content. Ending it leaves pending proposals as drafts (never discarded).
- **Audio preview** — a BE-served ElevenLabs clip of a proposal's text in the patient's voice, played
  for the caregiver before publication (preview only; the real synthesis is the publish step).
- **Caregiver JWT / Patient session** — the two identities TRN runs under (ACS; ADR-012 for the patient
  session, which must gain `trn.proposal.confirm`, Q1).
- **Lifecycle status** — `draft → caregiver-approved → patient-pending → published → retired`
  (trn-service-owned; FE reflects it).

## 2. View models (draft)

```
ProposalVM {
  id: string
  type: 'category' | 'phrase'
  parentId: string | null
  text: string                 // content.en.text
  caregiverConfirmed: boolean  // content.en.caregiverConfirmed
  patientConfirmed: boolean    // content.en.patientConfirmed
  dualAuthorized: boolean      // derived: caregiverConfirmed && patientConfirmed
  status: 'draft' | 'caregiver-approved' | 'patient-pending' | 'published' | 'retired'
  audioRef: string | null      // content.en.audioRef (preview key; null until synthesized)
  previewSource: 'be-clip' | 'tts-fallback' | 'text-only' | null
  adjustOptions: string[]      // short LLM-suggested variations (Screen 09 Adjust; not free text)
}

TrainingScreenVM {                 // Screen 08 — caregiver
  sessionState: 'empty' | 'active' | 'loading' | 'error' | 'ended-pending'
  messages: ChatTurn[]             // { role: 'caregiver' | 'assistant', text }
  proposals: ProposalVM[]          // draft nodes of the active session
  consentCaptured: boolean         // ADR-017 gate before preview/publish
}

PatientConfirmScreenVM {           // Screen 09 — patient
  pending: ProposalVM[]            // caregiverConfirmed && !patientConfirmed (en)
  activeChannel: 'touch' | 'gesture' | 'scan'
  recordState: 'idle' | 'loading' | 'recorded' | 'error'
}
```

## 3. UI events (user-driven state changes)

- **Screen 08:** `startSession()`, `sendMessage(text)`, `approveProposal(id)` (caregiver side),
  `editProposal(id, text)`, `previewAudio(id)`, `endSession()`.
- **Screen 09:** `confirmProposal(id)` (patient side), `adjustProposal(id, variationId)`,
  `rejectProposal(id)`, `scanTick()` / `scanConfirm()`, `gestureIntent(ref)` (inbound via
  `NavigationIntentPort`, resolved to a pending proposal), `back()` (to CONV Screen 06).

## 4. State transitions (UI level)

```
Session (S08):   empty → starting → active ⇄ loading(LLM)         (error→active, drafts kept)
                 active → ended-pending   (End session; proposals persist as drafts)
Proposal (S08):  draft → approving → caregiver-approved           (caregiverConfirmed=true)
Preview (S08):   resolve → be-clip-play | tts-play | text-show    (fail-safe cascade)
Proposal (S09):  patient-pending → confirming → published         (both confirmed ⇒ BE publishes)
                 patient-pending → adjusting → re-proposed | rejected
Publish (BE):    patient-pending → (synth+index+activate) → published | pending-synth(on ElevenLabs down)
Scanning (S09):  scan-idle → scan-cursor-moving → scan-confirmed → confirmProposal
```

## 5. Invariants (client-side)

- A node is shown as **published** only when trn-service reports both confirmations true; the FE never
  infers publication from a single side.
- **Screen 09 shows only** proposals with `caregiverConfirmed=true && patientConfirmed=false` (en).
- **Adjust** on Screen 09 selects among **short LLM-suggested variations** — never free-text editing
  (the patient may lack fine motor control).
- Every channel (touch / gesture / scan) resolves to the **same** `confirmProposal(id)` action; no
  channel bypasses the dual-authorization gate.
- The FE **never** calls Claude or ElevenLabs directly and **never** holds a vendor key; all AI goes
  through `trn-service`.
- Audio preview MUST never silently fail: BE clip → device TTS → large text, in that order, honestly
  labelled; a missing clip is a **state**, not an error, and never blocks authoring.
- `caregiverAuthoringGuard` and `patientConfirmGuard` MUST decide from the real session
  (`trn.*` / `trn.proposal.confirm` authority); never `return true`.
- TRN MUST NOT implement CONV publish internals (ES index, CONV activation), mint tokens, or speak on
  the patient's live path — it surfaces status only.
- TODO[architect]: whether `Adjust` re-proposals re-enter the caregiver's queue for re-approval or
  auto-inherit the caregiver side (ADR-016 nuance). Vision default: **re-approval required** (the
  caregiver re-confirms an adjusted text). Confirm at M1.5 before Specs.
