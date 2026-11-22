# 06 — Risks, Gaps, Assumptions — conv (CONV)

## 1. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Cold-empty offline** — station never synced, then offline ⇒ patient cannot speak. | High (patient is mute) | First sync mandatory during provisioning (Screen 07 / onboarding); honest empty-state; document as hard dependency. |
| R2 | **Audio clip missing** for an active phrase. | Medium | Fail-safe cascade: cached → `SpeechSynthesis` (OPS-004) → large text; never silent (ADR-005). |
| R3 | **Switch-scan timing** mis-tuned for a given patient. | High (unusable) | Configurable dwell/scan interval per profile; validated with the caregiver during onboarding. |
| R4 | **Cache growth** (many audio Blobs) exceeds storage quota. | Medium | Diff-based prefetch; eviction of superseded `audioRef`; quota check + telemetry. |
| R5 | **Stale cache** shows outdated/removed phrases while offline. | Medium | Version marker + atomic swap on next sync; TRN removals propagate on reconnect only. |
| R6 | **Identity confusion** — two tokens on one station (patient-session for CONV vs edge.device for GEST/EDGE). | High (security) | Host wires two interceptors; CONV egress uses patient-session bearer only; see Q1. |
| R7 | **Bundle size** on a low-power station. | Low/Med | Standalone + lazy `loadComponent`; no Material; thin shell; OnPush. |

## 2. Known gaps

- **G1 (shared with GEST, INT-FE-GEST-003)** — the **Patient-Mode host** (`patient-shell`) is not yet
  decided/scaffolded. CONV joins **GEST + libs/edge in the same host**; that host must wire: the
  patient-session interceptor (CONV egress), the device-token interceptor (GEST/EDGE egress), the
  `STATION_LIVENESS_PORT` (edge→gest), and the `NAVIGATION_INTENT_PORT` (gest→conv). Blocks final
  routing + provider wiring.
- **Contract gap** — conv-service endpoints (tree snapshot, audio asset) are **BE-owned (M1.5)** and
  not yet published; the api/ ports here are shaped against the prototype model and must be
  reconciled at Specs.
- **Registry label** — `modules.registry[CONV].frontendLib = "conv-ui"` contradicts the verified
  on-disk convention `@neuroassist/conv` (`libs/conv`). Needs reconciliation (non-blocking).
- **Switch-scanning** has no prototype reference (prototype shows touch + simulated gesture only);
  its interaction model is a vision-level addition to validate in Specs/UX.

## 3. Assumptions to validate

- A1 — The published snapshot is small enough to cache whole per patient (tree = one patient's nodes).
- A2 — Audio clips are served as cacheable Blobs/URLs via the conv-service contract (not live
  ElevenLabs calls from the station).
- A3 — Target devices support Service Worker + Cache Storage + IndexedDB + `SpeechSynthesis`.
- A4 — Patient-session token (ADR-012) is attachable to CONV egress by the host interceptor and
  carries `conv.*` authorities (ACS INV-3).
- A5 — `/patient/confirm-training` is owned by TRN's patient-confirmation surface; CONV only links to it.

## 4. Critical dependencies

- **G1 Patient-Mode host** (shared with GEST/edge) — hard blocker for integration wiring.
- **conv-service api-contract (BE M1.5)** — tree snapshot + audio assets.
- **ACS** — patient-session token + `conv.*`/`gest.*` authorities (ADR-012, INV-3).
- **PAT** — `GET /pat/patients/{patientId}` (`pat.patient.read`) for patient context.
- **TRN** — upstream author of tree + audio; owner of the patient-confirmation surface.
- **Shared libs** — `@neuroassist/shared/{access-http-base,access-decision,auth-session,error-model,ui-feedback,ui-tokens,observability}`.

## 5. Open questions (for M1.5 / Specs)

- **Q1** — Does the station carry **both** a patient-session token (CONV) and an edge.device token
  (GEST/EDGE), and how are the two interceptors scoped per egress? (Owner default: yes, two tokens.)
- **Q2** — Does selecting a phrase with an `engineFeatureRef` also emit a catalog **Event** (prototype
  TODO, framing §12 Q6)? Vision default: **no** in v1 (EVNT owns events).
- **Q3** — Audio-asset delivery shape (per-clip URL vs bundled manifest) — BE M1.5.
- **Q4** — Does the caregiver ever view the tree in CONV? Vision answer: **no** — viewing/authoring is
  TRN; confirmation is the TRN patient surface; DASH is caregiver analytics, not the tree.
