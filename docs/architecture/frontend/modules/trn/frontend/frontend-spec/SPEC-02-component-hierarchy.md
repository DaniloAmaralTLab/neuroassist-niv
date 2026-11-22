# SPEC-02 — Component Hierarchy — trn (TRN) Frontend

> Smart components inject the TRN facades/services and read their signals; presentational components
> receive inputs and emit outputs. **No EARS here** (component trees are structure, not behavior — EARS
> guide "Where NOT to use EARS"). No Angular code is generated at this stage; the trees are illustration.
> Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/04` §3, BA wireframe Screens 08/09.

## 1. `feature-training` tree (Screen 08 — caregiver)

```
TrainingSessionPageComponent                 (smart — Screen 08; OnPush, standalone)
│   injects: TrainingSessionFacade, ProposalFacade, ConsentFacade, AudioPreviewService
│   reads signals: vm() (TrainingScreenVM), sessionState(), messages(), proposals(),
│                  consentState(), llmState()
│
├── TrainingBadgeComponent                    (presentational)
│     renders the persistent "Training — not the patient app" topbar badge (TECH-007)
│
├── ChatConversationPanelComponent            (smart-ish — reads TrainingSessionFacade)
│     @Input messages: ChatTurn[]              → caregiver/assistant turns
│     @Input llmState: 'idle' | 'responding' | 'error'
│     emits:  (sendMessage text)               → TrainingSessionFacade.sendDialogTurn(text)
│     renders the streaming/responding state + honest "assistant unavailable — try again" on 503
│
├── ConsentGateBannerComponent                (presentational)
│     @Input consentState: 'unknown' | 'granted' | 'missing' | 'revoked'
│     emits:  (captureConsent)                 → opens ConsentCaptureDialog
│     rendered when consentState !== 'granted'; blocks preview/publish affordances
│
├── ProposedNodeListComponent                 (presentational)
│     @Input proposals: ProposalVM[]           → draft/proposed/caregiver_approved nodes
│     emits:  (approve id) (edit id,text) (reject id) (preview id) (openAssent id) (publish id)
│     renders a dual-confirm indicator per node (caregiver ✓/⏳ · patient ✓/⏳) + lifecycle badge
│     └── ProposedNodeCardComponent            (presentational, per node)
│           @Input proposal: ProposalVM
│           renders Approve + Edit + Reject + Preview + "Capture patient assent" + Publish affordances,
│           each gated by the proposal.state and the dual-confirm status
│
├── AudioPreviewButtonComponent               (presentational)
│     @Input previewSource: 'be-clip' | 'tts-fallback' | 'text-only' | null
│     emits:  (preview id)                     → AudioPreviewService.preview(proposal)
│     renders the honest preview-vs-fallback-vs-unavailable indicator (never silent)
│
└── EndSessionButtonComponent                 (presentational)
      emits:  (endSession)                     → pending proposals persist as drafts (never discarded)
```

### Smart component — `TrainingSessionPageComponent`

The smart host of Screen 08. It injects `TrainingSessionFacade` (LLM dialog/streaming state),
`ProposalFacade` (dual-confirm + lifecycle status), `ConsentFacade` (the consent gate) and
`AudioPreviewService` (fail-safe preview). It owns **no `HttpClient`** and issues HTTP only through the
facades' ports. Signals it reads (explicit, doc 04 §6):

| Component | Signals read |
|---|---|
| `TrainingSessionPageComponent` | `TrainingSessionFacade.sessionState()`, `.messages()`, `.llmState()`, `ProposalFacade.proposals()`, `.status(id)`, `.dualConfirm(id)`, `ConsentFacade.consentState()`, `AudioPreviewService.previewSource()` |

## 2. `feature-patient-assent` tree (Screen 09 — assisted, caregiver session)

```
PatientAssentPageComponent                    (smart — Screen 09; OnPush, standalone)
│   injects: ProposalFacade, NavigationService (switch-scan), AudioPreviewService
│   reads signals: vm() (PatientAssentScreenVM), pending(), activeChannel(), recordState()
│
├── PendingAssentListComponent                 (presentational)
│     @Input pending: ProposalVM[]             → proposals in state 'caregiver_approved' (patient half pending)
│     @Input activeChannel: 'touch' | 'gesture' | 'switch-scan'
│     emits:  (confirm id) (adjust id) (reject id)
│     large-target tiles; every channel resolves to the same confirm/adjust/reject action
│     └── AssentNodeCardComponent              (presentational, per node)
│           @Input proposal: ProposalVM
│           renders Confirm / Adjust / Reject as large targets; no free-text input
│
├── ChannelBadgeComponent                      (presentational)
│     @Input activeChannel: 'touch' | 'gesture' | 'switch-scan'   → "Active channel: …"
│
├── AssentEvidenceFormComponent                (presentational)
│     @Input confirmedBy / method / relationship (assisted entry by the caregiver)
│     emits:  (record { confirmedBy, method, evidenceRef, relationship? })
│             → ProposalFacade.recordPatientAssent(id, payload)   (distinct actor from the caregiver half)
│
└── ScanCursorComponent                        (presentational)
      switch-scan cursor affordance (dwell/scan timing from NavigationService, reused from CONV)
```

### Smart component — `PatientAssentPageComponent`

The assisted patient-assent host. It injects `ProposalFacade` (reads `pending()` = proposals whose
caregiver half is recorded and patient half is not), `NavigationService` (switch-scan timing reused from
the CONV navigation model) and `AudioPreviewService`. All three input channels (touch, gesture via
`NAVIGATION_INTENT_PORT`, switch scan) converge on the same `ProposalFacade.recordPatientAssent(id, …)` /
`adjust(id)` / `reject(id)` — no channel forks the state (ADR-007 of CONV, reused). It runs under the
**caregiver** session, so its egress carries the caregiver bearer; the patient contributes the assent
fact (`confirmedBy`, `method`, `evidenceRef`, `relationship?`), captured assisted.

## 3. What TRN does NOT render

TRN renders **no** CONV runtime (navigation/playback — `libs/conv`), **no** webcam/gesture-recognition
surface (GEST), **no** alarm/event takeover (EVNT), **no** caregiver dashboard (DASH) or history/audit UI
(HIST), and **no** device pairing (EDGE). It renders **no** direct vendor surface — Claude and ElevenLabs
are reached only through `trn-service` (FE ADR-007). It does **not** implement the CONV publish internals
(ES indexing, CONV activation) — those are BE-owned and surfaced as lifecycle status only (SPEC-03).
