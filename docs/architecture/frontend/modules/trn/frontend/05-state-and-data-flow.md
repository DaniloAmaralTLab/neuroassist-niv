# 05 — State and Data Flow — trn (TRN)

## 1. State topology

| State | Where | Kind |
|---|---|---|
| Active training session + LLM turns | `TrainingSessionFacade` signals (`authoring/`) | ephemeral UI (server-authoritative session id) |
| Proposals + dual-confirm + lifecycle status | `ProposalFacade` signals (`proposals/`) | server-authoritative, re-read on conflict |
| Consent captured (ADR-017) | `TrainingSessionFacade.consentCaptured()` | server-authoritative gate |
| Audio preview source + clip | `AudioPreviewService` (per-call) | ephemeral |
| Pending confirmations (Screen 09) | `ProposalFacade.pending()` | server-authoritative |
| Scan cursor + timing (Screen 09) | `navigation/` switch-scan model (signals) | ephemeral UI |
| Caregiver JWT / patient session + `trn.*` authorities | `@neuroassist/shared/auth-session` (global) | global |

TRN holds **no** global module store beyond the shared auth-session; proposal/session truth is
server-authoritative and re-read on conflict (TRN is a collaborative, write-heavy authoring tool — the
opposite of CONV's offline cache).

## 2. Data access pattern

`HttpClient` lives only in `api/` adapters behind `TRAINING_SESSION_PORT` / `PROPOSAL_PORT` /
`AUDIO_PREVIEW_PORT` (base `${ACCESS_HTTP_BASE}/trn`, **never** `/api/v1`). Adapters type responses as
`<...Wire>` mirroring the BE record and `.pipe(map(toDomain))`; the Mock adapter serves the same wire
shape through the same mappers; `provideTrn` defaults to the **mock** adapter while trn-service is
unarchitected (Learning `scaffold:mock-adapter-default`; flip to http on landing, proven by a providers
spec). **Facades never call HTTP directly** — they call the ports. **All LLM and ElevenLabs traffic is
proxied by trn-service**; there is no vendor endpoint in the FE (ADR-007 local).

## 3. Cache strategy (DEFAULT — recommended, revisable)

TRN **keeps the framework default** ("call the API per navigation") — it is a collaborative authoring
tool, not an offline runtime. Reads (session, proposals, pending) hit trn-service each navigation;
writes (approve/confirm/edit/adjust/reject) are server-authoritative. **No offline cache** of proposals
(unlike CONV): authoring over stale drafts would risk publishing content the other party already
changed. The only local persistence is per-viewer UI convenience (e.g. draft message text), never
authoritative proposal state.

## 4. Optimistic updates

**Scoped and reversible.** Approve / confirm / reject may update the dual-confirm indicator
optimistically for responsiveness, with a **server-authoritative re-read on conflict** (`412`/stale →
reconcile to server truth) — documented rollback. **Publication is never optimistic**: a node is shown
`published` only when trn-service reports both confirmations and a completed synthesis; on ElevenLabs
delay the node stays `pending-synth` (never a faked "published"). LLM proposals are **never** optimistic
(the FE renders only what the service returns — no fabricated proposal on a Claude timeout).

## 5. Error handling

trn-service `ProblemDetail` → `AppError` via `@neuroassist/shared/error-model` →
`@neuroassist/shared/ui-feedback`. **Vendor outages are first-class states, not generic errors:**

- **Claude (LLM) down/timeout** → training `error` state with retry; existing drafts preserved; no
  fabricated proposal.
- **ElevenLabs down / clip pending** → preview degrades (BE clip → device TTS → large text);
  publication deferred (`pending-synth`); honest status copy.
- **403 on `/patient/confirm-training`** (patient session lacks `trn.proposal.confirm`, ADR-012 gap) →
  misconfiguration/"ask your caregiver" state; never fake a confirmation.
- **401** (JWT expired / patient-session revoked) → stop; route to the surface's sign-in / "session
  ended"; never silently retry a revoked token.
- **412/conflict** (concurrent approval) → re-read server truth; reconcile the indicator.

Missing audio preview and `pending-synth` are **states**, not errors.

## 6. Breadcrumbs & navigation state

Screen 08 (caregiver) carries a light breadcrumb under the Shell (`Home → Training`) plus the
persistent **"Training — not the patient app"** topbar badge (TECH-007) — the primary orientation that
this is authoring, not the patient runtime. Screen 09 (patient) is near-single-screen under the minimal
Patient-Mode topbar (active patient + device status, no sidebar); orientation comes from the `back()`
action (to CONV Screen 06) and the active-channel badge. The switch-scan timing model (dwell ms, scan
interval) lives in `navigation/` and is host/profile-configurable for ALS/MND accessibility — reused
verbatim from the CONV navigation model so both patient surfaces behave identically.
