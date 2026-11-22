# 06 — Risks, Gaps, Assumptions — trn (TRN)

## 1. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **LLM (Claude) outage** mid-session blocks proposing. | Medium | BE-mediated; honest `error` state + retry; drafts preserved; no fabricated proposal (ADR-007 local). |
| R2 | **ElevenLabs outage / slow synthesis** delays publication + preview. | Medium | Preview fail-safe (BE clip → device TTS → text); publication deferred as `pending-synth`, never faked (ADR-007 local). |
| R3 | **Wrong/unwanted phrase reaches CONV** (patient's only channel). | **High (safety)** | Dual-Authorization hard gate (ADR-005 local / ADR-016); publish only on both confirmations; retire path. |
| R4 | **Patient session lacks `trn.proposal.confirm`** (ADR-012 only grants `conv.*`/`gest.*` today). | High (blocks Screen 09) | Open question Q1 to ACS/M1.5; `patientConfirmGuard` surfaces `403` honestly; no fake confirm. |
| R5 | **Switch-scan timing** mis-tuned for a given patient on Screen 09. | High (unusable) | Reuse CONV configurable dwell/scan model; validate per profile at onboarding. |
| R6 | **Free-text temptation on Adjust** (patient lacks fine motor control). | Medium | Adjust = short LLM-suggested variations only; no text input on Screen 09 (invariant). |
| R7 | **Vendor key/SDK leaking into the FE.** | High (security) | No vendor SDK in the browser; all AI via trn-service; CI/lint check for vendor imports. |
| R8 | **Concurrent caregiver approval** races the indicator. | Low/Med | Server-authoritative re-read on `412`; optimistic only on reversible actions. |
| R9 | **Consent not captured** before synthesis. | High (compliance) | Consent gate (ADR-017) blocks preview/publish until recorded by trn-service. |

## 2. Known gaps

- **G1 (shared with CONV/GEST)** — the **Patient-Mode host** is not yet decided/scaffolded. TRN's
  **Screen 09** (`feature-patient-confirm`) mounts there under the patient-session identity and needs
  the host to wire the `NAVIGATION_INTENT_PORT` (GEST→TRN) and the patient-session interceptor. Blocks
  Screen 09 routing + provider wiring. Screen 08 (caregiver web Shell) is **not** blocked by G1.
- **Contract gap** — trn-service endpoints (session, proposals, approve/confirm, audio preview, status)
  are **BE-owned (M1.5, concurrent)** and not yet published; the `api/` ports here are shaped against
  the BA wireframe (Screens 08/09) and must be reconciled at Specs. Adapter default stays `'mock'`.
- **Authority gap (Q1)** — the patient session (ACS ADR-012, INV-3) carries only `conv.*`/`gest.*`;
  `trn.proposal.confirm` must be added for Screen 09. Owner/ACS decision pending.
- **Registry label** — `modules.registry[TRN].frontendLib = "trn-ui"` contradicts the verified on-disk
  convention `@neuroassist/trn` (`libs/trn`, confirmed in `libs/trn/README.md`). Needs reconciliation
  (non-blocking).
- **No prototype reference** — Screens 08/09 are **BA-draft, not implemented in the Angular prototype**
  (wireframe Amendment 4); their interaction models are vision-level and must be validated in Specs/UX.
  `libs/trn` on disk is a placeholder (`README.md` only), scaffolded later by the Nx generator.

## 3. Assumptions to validate

- A1 — trn-service proxies **all** Claude + ElevenLabs traffic; the FE never needs a vendor key or SDK.
- A2 — Audio preview is a **BE-served clip/URL** (not a live ElevenLabs call from the browser).
- A3 — The caregiver web Shell `neuroassist-niv-web` can register `@neuroassist/trn` as a "Training"
  menu item (ADR-006), and the Patient-Mode host can mount `feature-patient-confirm` separately.
- A4 — The patient-session token (ADR-012) can be extended with `trn.proposal.confirm` (Q1) and the
  Patient-Mode host attaches it on Screen 09 egress.
- A5 — Target devices on Screen 09 support switch scanning + `SpeechSynthesis` (same as CONV A3).
- A6 — Consent capture (ADR-017) is a trn-service step the FE can gate on before preview/publish.
- A7 — `Adjust` variations come from the service (short options), and an adjusted node re-enters
  caregiver re-approval (framing §5 TODO default).

## 4. Critical dependencies

- **trn-service api-contract (BE M1.5, concurrent)** — session, proposals, approve/confirm, preview,
  status; owner of Claude + ElevenLabs + ES indexing + the CONV publish push.
- **ACS** — caregiver JWT + patient-session token (ADR-012) incl. `trn.proposal.confirm` (Q1).
- **G1 Patient-Mode host** (shared with CONV/GEST) — hard blocker for Screen 09 integration wiring.
- **Caregiver web Shell** `neuroassist-niv-web` — mounts Screen 08 (ADR-006 descriptor registration).
- **PAT** — `GET /pat/patients/{patientId}` (`pat.patient.read`) for patient context.
- **CONV** (`libs/conv`) — downstream consumer; owner of the "N phrases to confirm" banner that links
  to TRN Screen 09.
- **Shared libs** — `@neuroassist/shared/{access-http-base,access-decision,auth-session,error-model,ui-feedback,ui-tokens,observability}`.

## 5. Open questions (for M1.5 / Specs)

- **Q1** — Does the patient session (ADR-012) gain `trn.proposal.confirm`, and does the Patient-Mode
  host attach it on Screen 09 egress? (Vision default: **yes**, a narrow confirm-only authority.)
- **Q2** — Does an `Adjust` re-proposal require caregiver **re-approval**, or auto-inherit the caregiver
  side? (Vision default: **re-approval required**, framing §5.)
- **Q3** — Audio-preview delivery shape (per-proposal clip URL vs on-demand synth-preview endpoint) —
  BE M1.5.
- **Q4** — Is the Screen 09 route owned by TRN at `/patient/confirm-training` (CONV links to it), and
  does CONV ever render the confirmation inline? (Vision answer: **TRN owns it**; CONV only links.)
- **Q5** — Does ending a training session with pending drafts notify the patient (push/badge), or does
  the patient discover them via the CONV banner only? (Vision default: **CONV banner only** in v1.)
