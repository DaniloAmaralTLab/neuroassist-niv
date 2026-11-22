# SPEC-07 — Error Handling — trn (TRN) Frontend

> The fail-safe core: **a vendor outage, a locked state or a missing clip must never make TRN fabricate a
> proposal, fake a publication, or lose a draft** (FE ADR-007; doc 03 §5 invariants; BE api-contract §9
> error model). LLM-down and pending-synth are **states**, not errors. TRN maps the caregiver-path
> `ProblemDetail`s only — it owns no patient runtime.

## 1. `ProblemDetail` → `AppError` → caregiver copy

trn-service returns `application/problem+json` (BE §9). TRN maps it via
`@neuroassist/shared/error-model` (`ProblemDetail → AppError`) and surfaces copy via
`@neuroassist/shared/ui-feedback`. Vendor-outage and pending-synth resolve to a **state**, not a modal.

## 2. BE `type` slug → FE behaviour (the failure table)

| BE `type` slug | HTTP | Where | FE behaviour |
|---|---|---|---|
| `unauthenticated` | 401 | any `/trn` call | **session ended** — stop, route to the caregiver sign-in / "session ended" surface; never silently retry a revoked token |
| `forbidden` | 403 | any `/trn` call | **missing authority** — disable/hide the affordance and surface "you do not have permission — ask your admin"; never fabricate a result |
| `patient-not-found` | 404 | `POST /trn/sessions` (§2.1) | **banner** "patient not found in your tenant"; create no session |
| `proposal-state-locked` | 409 | PATCH / confirm / assent / reject (§3.3, §4) | **re-read server truth** — the proposal changed; toast "this proposal changed — reloaded" and reconcile the indicator |
| `dual-authorization-same-actor` | 409 | `POST .../patient-assent` or `/caregiver-confirmation` (§4) | **banner** "the patient/guardian assent must be a different person from the caregiver"; record nothing |
| `incomplete-consent` | 422 | `POST /trn/consents` (§5.1) | **consent gate** "both the patient and the legal representative must consent"; capture no granted consent |
| `consent-required` | 409 | `POST .../publication` (§6.1) | **block publish**, route to the consent-capture gate; do not call synthesis |
| `not-approved` | 409 | `POST .../publication` (§6.1) | **banner** "this proposal is not yet dual-authorized"; start no publication |
| `dangling-audio-reference` | 422 | internal publish guard (§6.1) | surface the node as **pending-synth** "waiting on synthesis"; never show published |
| `llm-unavailable` | 503 | `POST .../dialog` (§3.1) | **training error state** + retry; existing drafts preserved; render no fabricated proposal |
| `audit-unavailable` | 502 | session/approve/publish hard-502 paths (§2.1, §4.2, §6.2) | **banner** "could not record the governance fact — try again"; the action did not persist |

## 3. Fail-safe audio preview cascade (ADR-007)

Caregiver audio preview resolves in strict order and is **never silently absent**:

```
BE-served clip present            → play the clip (patient's cloned voice)                 previewSource='be-clip'
clip missing / no preview endpoint → device TTS (SpeechSynthesis, OPS-004) of the phrase    previewSource='tts-fallback'
neither available                 → render the phrase text LARGE on screen (visual-only)    previewSource='text-only'
```

> **v1 reality:** trn-service exposes **no** pre-publication preview-clip endpoint (SPEC-04 §5,
> INT-FE-TRN-1); synthesis happens at publication. So in v1 `previewSource` resolves to `tts-fallback` or
> `text-only` (never `be-clip`), honestly labelled. A missing clip is a **state**, not an error, and never
> blocks authoring.

## 4. Pending-synth and LLM-down are states, not errors

- **LLM (Claude) down** (`503 llm-unavailable`) → the training surface shows an honest `error` state with
  retry; drafts already created are preserved; the caregiver is **never** shown a fabricated proposal
  (doc 05 §5).
- **ElevenLabs down / clip pending** → the publication stays `pending` (surfaced `pending-synth`); the FE
  **never** shows `published` without a service-confirmed synthesis. Preview degrades per §3.

## 5. Toast vs banner vs modal, retry, telemetry

- **Banner** (inline, calm): session-ended, missing-authority, patient-not-found, same-actor,
  incomplete-consent, not-approved, audit-unavailable — inline on the working surface, the proposal list
  stays visible beneath where possible.
- **Toast**: a `proposal-state-locked` re-read ("reloaded"), a manual retry that failed outright.
- **Consent gate**: `incomplete-consent` / `consent-required` route to the consent-capture gate, not a
  generic error.
- **Modal**: **only** for the destructive **erase** confirmation (`trn.content.delete`), which is
  irreversible; no other TRN flow takes over the viewport.
- **Retry**: the dialog turn retries on a `503` only by explicit caregiver action; TRN never retries a
  `401`/`403`. Publication status is **polled**, not retried blindly; the BE owns the durable retry.
- **Correlation / PII**: failures are reported through `@neuroassist/shared/observability` using the
  Access-Layer correlation id; **proposal text is never logged as PII beyond policy**; no `console.log`.

## Acceptance criteria (EARS)

- IF trn-service responds `401 unauthenticated` on a TRN call, THEN THE SYSTEM SHALL stop and route to the caregiver session-ended surface and SHALL NOT retry the revoked token.
- IF trn-service responds `403 forbidden` on a TRN call, THEN THE SYSTEM SHALL disable the affordance and surface a missing-permission message and SHALL NOT fabricate a result.
- IF `POST /trn/sessions` responds `404 patient-not-found`, THEN THE SYSTEM SHALL show the patient-not-found banner and SHALL NOT create a session.
- IF a confirm, assent, reject or edit responds `409 proposal-state-locked`, THEN THE SYSTEM SHALL re-read the server truth and reconcile the indicator and SHALL NOT keep the stale optimistic state.
- IF a patient-assent responds `409 dual-authorization-same-actor`, THEN THE SYSTEM SHALL show the distinct-actor banner and SHALL NOT record the assent.
- IF consent capture responds `422 incomplete-consent`, THEN THE SYSTEM SHALL show the consent gate requiring both the patient and the representative and SHALL NOT mark consent granted.
- IF publication responds `409 consent-required`, THEN THE SYSTEM SHALL block the publish and route to the consent-capture gate and SHALL NOT call synthesis.
- IF publication responds `409 not-approved`, THEN THE SYSTEM SHALL show the not-dual-authorized banner and SHALL NOT start a publication.
- IF `POST /trn/sessions/{id}/dialog` responds `503 llm-unavailable`, THEN THE SYSTEM SHALL show the assistant-unavailable error with retry and preserve existing drafts and SHALL NOT render a fabricated proposal.
- IF a hard-502 path responds `502 audit-unavailable`, THEN THE SYSTEM SHALL show the governance-fact-not-recorded banner and SHALL NOT treat the action as persisted.
- WHEN the caregiver previews a proposal with no available clip, THE SYSTEM SHALL fall back to device TTS then large text and SHALL NOT present a silent preview state.
- WHILE a publication is pending synthesis, THE SYSTEM SHALL surface the pending-synth state and SHALL NOT show the node as published.
