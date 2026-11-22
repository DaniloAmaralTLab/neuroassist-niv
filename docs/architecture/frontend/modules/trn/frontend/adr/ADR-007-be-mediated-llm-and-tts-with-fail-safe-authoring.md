# ADR-007 (TRN-local) — BE-mediated LLM + ElevenLabs synthesis with fail-safe authoring

- **Status:** aceita (accepted — orchestrator default; revisable at Specs/M1.5)
- **Scope:** `libs/trn` — all AI-assisted authoring (the Screen 08 LLM conversation + audio preview and
  the Screen 09 adjust variations). (Numbered 007 to avoid collision with the shared ADR-006; see the
  module ADR README.)

## Context

TRN is the **only** screen in the product where an LLM generates content (BA Screen 08 §5.5, TECH-007),
and the **only** place audio is synthesized (ElevenLabs, ADR-017). Two vendors are involved —
**Anthropic Claude** (propose categories/phrases, suggest short adjustment variations) and
**ElevenLabs** (synthesize the patient's voice). Putting either vendor's SDK or key in the browser
would be a security and compliance failure (keys exposed, no central redaction, no consent enforcement
point, LGPD exposure on a healthtech product). The interactions are also **slow and failure-prone**:
an LLM turn takes seconds and can time out; synthesis can lag or fail. The patient's safety depends on
TRN **never fabricating** a proposal and **never faking** that audio/publication happened.

## Decision

All AI is **mediated by `trn-service`**; the FE renders states and degrades safely:

1. **No vendor SDK or key in the FE.** The browser talks only to `trn-service` via
   `${ACCESS_HTTP_BASE}/trn`. Claude and ElevenLabs are reached **only** server-side. A lint/CI check
   forbids vendor imports in `libs/trn`.
2. **Streaming/async LLM states are first-class.** `TrainingSessionFacade` models a turn as
   `active → loading(LLM) → active`; the UI shows an explicit responding state and the persistent
   **"Training — not the patient app"** badge (TECH-007). The FE renders **only** what the service
   returns — on a Claude timeout it shows an honest `error` + retry and **preserves existing drafts**;
   it never invents a proposal.
3. **Fail-safe audio preview.** `AudioPreviewService` resolves **BE-served clip → device TTS
   (`SpeechSynthesis`, OPS-004) → large on-screen text**, with an honest "preview vs fallback vs
   unavailable" label. A missing clip is a **state**, not an error, and never blocks authoring.
4. **Publication is never faked.** Dual authorization triggers a **BE** synthesis + ES index + CONV
   activation. On an ElevenLabs outage the node stays **`pending-synth`** (surfaced as such); the FE
   **never** shows `published` without a service-confirmed completed synthesis.
5. **Consent gate (ADR-017).** The FE blocks preview/publish until `trn-service` reports voice-sample +
   processing consent captured.
6. **Adjust uses short, service-supplied variations**, not free text (Screen 09; patient motor limits).
7. **Adapter default `'mock'`** while trn-service is unarchitected (Learning
   `scaffold:mock-adapter-default`): `provideTrn` ships `adapter:'mock'` with an `INT-FE-TRN-002: http
   adapter pending trn-service` header; HTTP adapters use base `${ACCESS_HTTP_BASE}/trn`, type `<Wire>`
   and `.pipe(map(toDomain))`; the Mock serves the same wire shape via the same mappers; a providers
   spec proves the default; flip to `'http'` when trn-service lands.

## Alternatives considered

- **Call Claude/ElevenLabs directly from the browser.** Rejected: key exposure, no central
  redaction/consent, LGPD risk on a healthtech product, CORS/quotas on the client.
- **Render an optimistic/fabricated proposal on LLM timeout.** Rejected: safety — a patient could end
  up with a phrase no one actually proposed.
- **Synthesize on-device at authoring time (Web Speech as primary).** Rejected: not the patient's
  voice; device TTS is the **fallback**, not the product promise (ADR-017). Pre-synthesized ElevenLabs
  clips are the deliverable.
- **Mark a node `published` immediately on dual-confirm (before synthesis).** Rejected: CONV would show
  a node with no audio; `pending-synth` is the honest intermediate state.

## Consequences

- (+) No vendor credentials in the browser; one central point for redaction, consent and correlation.
- (+) Honest degradation: outages never lose a draft and never fake content/audio/publication.
- (+) The FE is testable against the Mock adapter with the same wire shapes trn-service will emit.
- (−) Every AI interaction is a round-trip to trn-service — latency is visible (mitigated by explicit
  streaming/async states, success signal p95 < 4 s).
- (−) The FE depends on trn-service for **all** AI (hard dependency, 06 contract gap) — until it lands,
  authoring runs against the Mock adapter only.
- (−) Extra lifecycle state (`pending-synth`) to model and display.

## References

- 02 §3 (golden paths A/B/C + edge cases), 02 §5 (AI mediation, audio, consent), 05 §4–§5 (optimistic
  scope, vendor-outage error handling), 06 R1/R2/R7/R9 + Q3.
- BA wireframe Screen 08 §5.5 (AI panel, required states incl. Claude API error) + Screen 09 §5.3
  (Adjust = short variations); TECH-007 (AI-only screen); ADR-017 (ElevenLabs); ADR-015 (ES indexing).
- Learning `scaffold:mock-adapter-default` (default mock + mappers + providers spec); OPS-004 (device
  TTS fallback).
