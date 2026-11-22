# 02 — Architecture Blueprint — trn (TRN) Frontend

## 1. System boundary

The TRN frontend is the **authoring front** of the speech tree — two caregiver/patient surfaces that
are **clients of `trn-service`** (through the API gateway) and of nothing else. All AI is behind that
service: `trn-service` orchestrates the **Anthropic Claude** conversation and the **ElevenLabs**
synthesis, indexes dual-authorized nodes in **Elasticsearch** (ADR-015), and activates them in the
CONV snapshot. The FE **never** holds a vendor key, **never** calls Claude or ElevenLabs directly, and
**never** touches the CONV runtime or its publish internals. TRN is upstream of CONV and asynchronous:
approved content later appears in CONV's synced snapshot — there is no synchronous screen handoff.

> Contract note: concrete trn-service endpoints (training session, proposals, approve/confirm, audio
> preview, status) are **owned by the BE vision (M1.5, concurrent)**. This blueprint references them
> abstractly under `${ACCESS_HTTP_BASE}/trn` and must be reconciled against the published api-contract
> at Specs time — no URLs are invented here, and the adapter default stays `'mock'` until then.

## 2. External actors and systems

- **Caregiver (web Shell)** — authenticated by an **ACS caregiver JWT**; drives the Screen 08 training
  session; approves their own side; previews audio.
- **Patient (Patient-Mode host)** — authenticated by the **ACS patient-session token** (ADR-012);
  confirms/adjusts/rejects on Screen 09 via gesture / touch / switch scan (input-channel-agnostic).
- **trn-service (BE)** — the only backend TRN calls; orchestrates Claude + ElevenLabs + ES + the CONV
  publish push (contract M1.5). Mediates **all** vendor access.
- **ACS** — issues both tokens; the patient session must gain a narrow `trn.proposal.confirm`
  authority (ADR-012; open question Q1). JWKS validates both.
- **PAT** — `GET /pat/patients/{patientId}` (`pat.patient.read`) for patient context.
- **CONV (downstream, out-of-band)** — receives published nodes via its own sync; shows a "N phrases
  to confirm" banner that **links to TRN Screen 09**. No synchronous handoff.
- **Browser platform** — no third-party widget, **no vendor SDK**, no analytics SDK. Audio preview
  uses an HTML audio element over a BE-served clip; `SpeechSynthesis` (Web Speech API) is the fallback.

## 3. End-to-end user flows

### Golden path A — Caregiver training session (Screen 08, web Shell)

```
Caregiver signs in (ACS JWT) → Shell → /training   [caregiverAuthoringGuard: trn.session.* via AccessDecisionService]
  Start session → TrainingSessionFacade.start()
        └─ POST ${ACCESS_HTTP_BASE}/trn/<session>        (Bearer caregiver JWT; contract M1.5)
  Caregiver turn (text/voice) ─▶ ChatConversationPanel ─▶ TrainingSessionFacade.send(message)
        └─ trn-service → Claude (BE-mediated)  ─▶ streaming/async LLM reply + proposed node(s)
                                   │
                                   ▼
  ProposedNodeCard list  (per-profile dual-confirm indicator: ✅/⏳ caregiver · ⏳ patient)
        ├─ Approve (caregiver side) ─▶ PATCH .../proposals/{id} (trn.proposal.approve) → caregiverConfirmed=true
        ├─ Edit ─▶ adjust text before approving (trn.proposal.edit)
        └─ Preview audio ─▶ AudioPreviewService.play(proposal)
                 ├─ BE-served clip present ─▶ play (patient's voice, ElevenLabs via BE)
                 ├─ clip pending/absent + SpeechSynthesis ─▶ device TTS of content.en.text
                 └─ neither ─▶ show text LARGE (honest "preview unavailable"), never silent/fake
  End session ─▶ pending proposals persist as drafts (never discarded)
```

### Golden path B — Patient confirmation (Screen 09, Patient-Mode host)

```
Patient station (Patient Mode, patient-session token) → /patient/confirm-training
                                                   [patientConfirmGuard: trn.proposal.confirm]
  PendingConfirmationFacade.load()
        └─ GET ${ACCESS_HTTP_BASE}/trn/<pending>    (caregiverConfirmed=true && patientConfirmed=false, en)
  Per proposal, via any channel (touch / gesture intent / switch-scan confirm):
        ├─ Confirm ─▶ PATCH .../proposals/{id}/confirm (trn.proposal.confirm) → patientConfirmed=true
        │        └─ both true ⇒ trn-service synthesizes (ElevenLabs) + indexes (ES) + publishes to CONV
        │                       (BE-owned; FE shows status "published", never drives the push)
        ├─ Adjust ─▶ choose among SHORT LLM-suggested variations (not free text) → re-propose
        └─ Reject ─▶ discard (node stays a draft elsewhere if applicable)
  Confirmation recorded → success feedback → back to Screen 06 (CONV runtime)
```

### Golden path C — Lifecycle/status (read-only surface)

```
Any proposal/node carries status: draft → caregiver-approved → patient-pending → published(active in CONV) → retired
  TRN FE renders the status badge + "waiting on patient / waiting on synthesis" copy.
  TRN FE does NOT implement ES indexing or CONV activation — it reflects trn-service status only.
```

### Edge cases

- **LLM (Claude) down** → training surfaces an honest error state ("assistant unavailable — try
  again"); drafts already created are preserved; the caregiver is never shown a fabricated proposal.
- **ElevenLabs down / clip not yet synthesized** → audio preview degrades to device TTS → large text;
  publication is **deferred** (node stays `pending-synth`), never faked as "spoken/published".
- **Patient session lacks `trn.proposal.confirm`** (ADR-012 gap, Q1) → `403`; Screen 09 surfaces a
  misconfiguration/"ask your caregiver" state; never fakes a confirmation.
- **401 on either surface** (JWT expired / patient-session revoked) → stop, route to the surface's
  sign-in / "session ended" state; never silently retry a revoked token.
- **Switch-scan mis-tuned** → dwell/scan timing is host/profile-configurable (reused from CONV
  `navigation/` model); every pending proposal must stay reachable by scan.
- **Concurrent approval** (two caregivers) → optimistic UI with server-authoritative re-read on
  conflict (`412`/stale); the dual-confirm indicator reflects server truth.

## 4. Internal boundaries (Nx libraries — module-as-library, ADR-006)

```
apps/trn/                                    # thin host (type:app, scope:trn) — buildable/serveable +
└── src/app/app.routes.ts                    #   e2e base; loadChildren → @neuroassist/trn

libs/trn/   (scope:trn)                       # module-as-library; importPath @neuroassist/trn (ADR-006)
└── src/lib/
    ├── trn.routes.ts                          # TRN_ROUTES[] (Screen 08 authoring + Screen 09 confirm)
    ├── trn.providers.ts                       # provideTrn({ adapter }) — DEFAULT 'mock' (see guard below)
    ├── trn.descriptor.ts                      # TRN_MODULE_DESCRIPTOR (section:'care', menu "Training")
    ├── trn.permission-map.ts                  # MODULE_PERMISSION_MAP (trn.* keys = BE authorities)
    ├── trn.feature-flags.ts                   # ModuleFeatureFlags (defaultState)
    ├── access/           (type:domain)        # caregiverAuthoringGuard + patientConfirmGuard
    │                                          #   (real session via AccessDecisionService — never `return true`)
    ├── api/              (type:data-access)   # TRAINING_SESSION_PORT + PROPOSAL_PORT + AUDIO_PREVIEW_PORT
    │                                          #   + Http/Mock adapters (base `${ACCESS_HTTP_BASE}/trn`; <Wire>+mappers)
    ├── proposals/        (type:domain)        # ProposalFacade (dual-confirm state, lifecycle status)
    ├── authoring/        (type:domain)        # TrainingSessionFacade (LLM dialog state, streaming)
    ├── audio-preview.service.ts               # BE clip → device TTS → large text (fail-safe preview)
    ├── integration/      (type:domain)        # NAVIGATION_INTENT_PORT consumer (reuse CONV seam on Screen 09)
    │                                          #   + TrnShellIntegrationService (host wiring, both shells)
    ├── navigation/       (type:domain)        # switch-scan timing model for Screen 09 (reused from conv)
    ├── feature-training/     (type:feature)   # Screen 08 page (OnPush, standalone) — caregiver web Shell
    ├── feature-patient-confirm/ (type:feature)# Screen 09 page (OnPush, standalone) — Patient-Mode host
    └── ui/ (optional)    (type:ui)            # ChatConversationPanel, ProposedNodeCard, dual-confirm badge,
                                               #   AudioPreviewButton, PendingConfirmationList, ChannelBadge

apps/trn-e2e/                                 # Playwright specs (LLM-down, ElevenLabs-down, 403 confirm, scan)
```

Tags: `scope:trn` + `type:{feature|data-access|domain|ui|app}`. A `scope:trn` lib may import only
`scope:trn` + `scope:shared`. The caregiver Shell imports `@neuroassist/trn` via `TRN_MODULE_DESCRIPTOR`
(the `scope:web → scope:trn` boundary is allowed). The **Patient-Mode host** (G1) mounts
`feature-patient-confirm` under the patient-session identity and wires the `NAVIGATION_INTENT_PORT`
(GEST→TRN, same in-process seam CONV uses).

> Pitfall guards (Learning D-611): (1) `trn.providers.ts` ships **default `adapter:'mock'`** with an
> `INT-FE-TRN-002: http adapter pending trn-service` header while trn-service is unarchitected; HTTP
> adapters use base `${ACCESS_HTTP_BASE}/trn`, type responses `<...Wire>` and `.pipe(map(toDomain))`;
> the Mock serves the same wire shape through the same mappers; a providers spec proves the default;
> flip to `'http'` when trn-service lands (`scaffold:mock-adapter-default`). (2) Both guards consult
> the real session via `AccessDecisionService`; **never** `return true` (`guard:stub-permissive`).

## 5. Cross-cutting concerns

| Concern | How TRN handles it |
|---|---|
| **Identity (AuthN)** | **Two tokens, two surfaces:** Screen 08 = caregiver **JWT** (ACS); Screen 09 = **patient-session** token (ACS, ADR-012). The two never mix; each surface egresses with its own bearer. |
| **AuthZ / RBAC** | `@neuroassist/shared/access-decision` — `caregiverAuthoringGuard` (`trn.session.*`/`trn.proposal.*` via JWT), `patientConfirmGuard` (`trn.proposal.confirm` via patient session). Keys mirror BE authorities verbatim (D-639); **never** `return true`. |
| **HTTP** | `@neuroassist/shared/access-http-base` interceptors (correlation + error-normalize); base `${ACCESS_HTTP_BASE}/trn` (**never** `/api/v1`). Only `api/` adapters hold `HttpClient`. |
| **AI mediation** | **No vendor SDK/keys in the FE.** Claude + ElevenLabs are reached only through `trn-service`; the FE renders streaming/async + fail-safe states (ADR-007 local). |
| **Audio preview** | `AudioPreviewService`: BE-served ElevenLabs clip → `SpeechSynthesis` fallback (OPS-004) → large text; honest "preview vs fallback vs unavailable" indicator. |
| **Input channels (Screen 09)** | `NAVIGATION_INTENT_PORT` in-process seam (GEST→TRN) + touch + switch-scan (reused `navigation/` model); large targets; `ChannelBadge`; one confirm-action model (mirror of CONV ADR-007). |
| **Consent** | Consent gate (voice-sample + ElevenLabs processing, ADR-017) shown before first synthesis/publish; recorded via trn-service; FE blocks preview/publish until consent is captured. |
| **Errors** | trn-service `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → `@neuroassist/shared/ui-feedback`. Vendor-outage / pending-synth are **states**, not errors. |
| **Observability** | `@neuroassist/shared/observability` — session start/turn latency, proposal/approve/confirm outcomes, preview source, publish-status transitions; **never logs proposal text as PII beyond policy**; no `console.log`. |
| **Design tokens** | Tailwind v4 oklch tokens via `@neuroassist/shared/ui-tokens`; dark default; CDK primitives (no Material); large targets for ALS/MND on Screen 09; "Training — not the patient app" badge on Screen 08. |
| **i18n** | None — English-only (ADR-018); content keeps a per-locale map shape but only `content.en` is authored. |
