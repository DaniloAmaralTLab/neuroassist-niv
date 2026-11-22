# FE-TRN-025 -- Error-handling pipeline — all 11 ProblemDetail type slugs mapped to AppError → banner/toast/consent-gate/state (SPEC-07 §2)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`TrnErrorHandlerService` maps all 11 trn-service `ProblemDetail` `type` slugs (SPEC-07 §2) to `AppError` via `@neuroassist/shared/error-model`, routes each to its prescribed UI treatment (banner / toast / consent-gate / `llmState('error')` / session-ended), and surfaces copy via `@neuroassist/shared/ui-feedback` without a single `console.log` or PII disclosure.

## Context / Problem statement
- SPEC-07 §1: trn-service returns `application/problem+json`; mapped via `@neuroassist/shared/error-model`.
- SPEC-07 §2 failure table: 11 distinct type slugs with specific FE behaviours.
- 503 `llm-unavailable` → `llmState('error')` (not a banner).
- 409 `consent-required` → route to consent-capture gate (not a generic error).
- 401 `unauthenticated` → stop + redirect to sign-in (never retry).
- SPEC-07 §5: correlation via `@neuroassist/shared/observability` using Access-Layer correlation ID; no proposal text PII logged.

## Approach (execution path)
1. Create `libs/trn/src/lib/error-handling/trn-error-handler.service.ts`.
2. Implement `handle(err: AppError, context: TrnErrorContext)` switch on `err.type`:
   - `unauthenticated` (401) → `authSession.endSession()` + router.navigate(['sign-in'])
   - `forbidden` (403) → `uiFeedback.banner('missing-permission')` + disable affordance signal
   - `patient-not-found` (404) → `uiFeedback.banner('patient-not-found')` + no session created
   - `proposal-state-locked` (409) → `uiFeedback.toast('proposal-reloaded')` + re-read proposal
   - `dual-authorization-same-actor` (409) → `uiFeedback.banner('distinct-actor-required')` + no record
   - `incomplete-consent` (422) → `uiFeedback.consentGate('both-required')` + no granted
   - `consent-required` (409) → route to consent capture gate
   - `not-approved` (409) → `uiFeedback.banner('not-dual-authorized')` + no publication
   - `dangling-audio-reference` (422) → surface as `pending-synth` state (not an error banner)
   - `llm-unavailable` (503) → `trainingSessionFacade.setLlmState('error')` + preserve drafts
   - `audit-unavailable` (502) → `uiFeedback.banner('governance-fact-not-recorded')`
3. No `console.log`; use `@neuroassist/shared/observability` for correlation-id-scoped logging.

## Non-goals
- No retries on 401 or 403.
- No PII (proposal text) in any log call.

## Layer(s)
frontend / Tool entry (`libs/trn/src/lib/error-handling/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§1, §2, §4, §5)

## Architecture alignment
- `ProblemDetail → AppError` via `@neuroassist/shared/error-model`
- Zero `console.log`; correlation ID from Access-Layer header

## Implementation checklist (by layer/file)

- 🔲 `libs/trn/src/lib/error-handling/trn-error-handler.service.ts` — 11-slug switch
- 🔲 Unit test: each of the 11 slugs maps to the correct UI treatment
- 🔲 Unit test: `llm-unavailable` → `llmState('error')` (not a banner)
- 🔲 Unit test: `consent-required` → routes to consent gate (not generic error)
- 🔲 Unit test: no `console.log` calls in the error handler

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 7 / UX polish

## Labels
type:feature
layer:frontend
scope:trn
priority:P7

## Acceptance criteria
- All 11 SPEC-07 §2 type slugs are handled by distinct case branches.
- `unauthenticated` → redirect, never retry.
- `llm-unavailable` → `llmState('error')`, never a modal.
- `consent-required` → consent-gate routing, not a generic banner.
- No `console.log` in the handler.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-011 (TrainingSessionFacade — llmState)
- FE-TRN-016 (ConsentCaptureDialog — consent gate routing)

## Data impact
- None — error routing only.

## API / Contract impact
- Consumes `application/problem+json` body from trn-service.

## Testing / Evidence required
- Unit tests: 11-slug coverage (one assertion per slug).

## Risks / Notes
- `dangling-audio-reference` maps to `pending-synth` state (not an error banner) — easy to misclassify; the unit test is the guard.
