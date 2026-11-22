# FE-TRN-029 -- e2e: caregiver-authoring-consent-gate.feature + caregiver-authoring-erase.feature (consent gate flow, destructive erase modal)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Two Playwright e2e specs: `caregiver-authoring-consent-gate.feature` asserts the full consent-capture flow (banner visible, dialog opens, patient + representative fields captured, `consent-required` publish block lifted after consent); `caregiver-authoring-erase.feature` asserts the destructive erase modal requires explicit confirmation and triggers content deletion.

## Context / Problem statement
- SPEC-08 §2: consent-gate and erase flows are listed as distinct e2e scenarios.
- Consent gate: `consent-required` returned on `POST /trn/publications` → banner appears → dialog opens → consent fields submitted → re-publish succeeds.
- Erase: erase affordance visible (requires `trn.content.delete`) → modal shown with destructive warning → user confirms → `DELETE /trn/patients/{id}/content` called → erase confirmation state.
- Both flows exercise error routing paths from `TrnErrorHandlerService` (FE-TRN-025).

## Approach (execution path)
1. Create `apps/trn-e2e/src/features/caregiver-authoring-consent-gate.spec.ts`:
   - Setup: authenticated caregiver with a dual-approved proposal.
   - Trigger publication → HTTP intercept injects 409 `consent-required`.
   - Assert: consent gate banner visible.
   - Open consent dialog → fill patient + representative fields → submit.
   - Assert: `consent-required` error clears; re-publish is now enabled.
2. Create `apps/trn-e2e/src/features/caregiver-authoring-erase.spec.ts`:
   - Setup: authenticated caregiver with `trn.content.delete` authority.
   - Click erase affordance → assert `EraseConfirmModalComponent` appears with warning text.
   - Dismiss → assert no delete call made.
   - Open again → confirm → assert `DELETE /trn/patients/{id}/content` called.

## Non-goals
- No testing of the consent domain logic itself (BE-authoritative).

## Layer(s)
frontend / e2e (`apps/trn-e2e/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§2)

## Architecture alignment
- Error-routing via `TrnErrorHandlerService` exercised in e2e (not mocked)
- Destructive-action modal tested for confirm AND dismiss paths

## Implementation checklist (by layer/file)

- 🔲 `apps/trn-e2e/src/features/caregiver-authoring-consent-gate.spec.ts`
- 🔲 `apps/trn-e2e/src/features/caregiver-authoring-erase.spec.ts`
- 🔲 HTTP intercept helpers for 409 consent-required injection

**Tests**
- 🔲 `npx nx e2e trn-e2e` PASS for both specs (or PENDING if BE not wired)

## Milestone
Wave 9 / e2e + Hardening

## Labels
type:test
layer:frontend
scope:trn
priority:P9

## Acceptance criteria
- `consent-gate` spec: consent banner appears on 409 `consent-required`; banner clears after consent submitted.
- `erase` spec: modal dismiss → no DELETE call; modal confirm → DELETE called with correct patient ID.
- `npx nx e2e trn-e2e` runs (may be pending if BE not wired).

## Dependencies
- FE-TRN-016 (ConsentGateBannerComponent + ConsentCaptureDialog)
- FE-TRN-025 (TrnErrorHandlerService — routes 409 consent-required to consent gate)
- FE-TRN-026 (EraseConfirmModalComponent)

## Data impact
- e2e test data only (fixture caregiver credentials and patient IDs).

## API / Contract impact
- Consent gate: `POST /trn/publications` (injected 409) + `POST /trn/consents`.
- Erase: `DELETE /trn/patients/{id}/content`.

## Testing / Evidence required
- `npx nx e2e trn-e2e --spec caregiver-authoring-consent-gate` PASS or PENDING.

## Risks / Notes
- Consent gate + erase are both rare paths; e2e intercepts are the primary coverage mechanism.
