# FE-TRN-028 -- e2e: caregiver-authoring-happy-path.feature + caregiver-authoring-llm-failure.feature (Playwright, real caregiverAuthoringGuard, no mock session)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Two Playwright e2e specs covering the caregiver authoring core path: `caregiver-authoring-happy-path.feature` (session created, dialog turn sent, proposal approved, assent captured, publication completed) and `caregiver-authoring-llm-failure.feature` (503 LLM-unavailable banner appears, existing proposals preserved, no fabricated proposal).

## Context / Problem statement
- SPEC-08 §1: `caregiver-authoring-happy-path.feature` and `caregiver-authoring-llm-failure.feature` are part of the 8-feature e2e corpus.
- Both run in `apps/trn-e2e/` with the real `caregiverAuthoringGuard` (caregiver session via `@neuroassist/shared/auth-session` test helper).
- Real caregiver session required — no `MockAuthSession` bypass per guard:stub-permissive rule.
- LLM-failure scenario must assert that the "LLM unavailable" banner appears AND that existing proposals are still displayed (no data loss).

## Approach (execution path)
1. Create `apps/trn-e2e/src/features/caregiver-authoring-happy-path.spec.ts` from SPEC-08 §1.
2. Create `apps/trn-e2e/src/features/caregiver-authoring-llm-failure.spec.ts` from SPEC-08 §1.
3. Happy-path flow: authenticate caregiver → navigate to `/training` → create session for patient → send a dialog turn → wait for proposal to appear → approve proposal → navigate to `/training/assent` → capture patient assent → trigger publication → wait for publication state.
4. LLM-failure flow: authenticate caregiver → create session → mock TTS service to 503 → send dialog turn → assert "LLM unavailable" banner → assert existing proposals remain → assert no new fabricated proposal in the list.
5. Auth helper: `caregiverAuthHelper.login(caregiverCredentials)` from `@neuroassist/shared/auth-session` test helpers.

## Non-goals
- No testing of the access-decision RBAC-of-UI gating (that is a unit-test concern for FE-TRN-023).
- No patient-session route tests (single caregiver identity).

## Layer(s)
frontend / e2e (`apps/trn-e2e/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§1 — caregiver authoring scenarios)

## Architecture alignment
- Real `caregiverAuthoringGuard` (never bypassed)
- No mock session bypass
- `pending-synth` state observable in e2e (publication polling can be asserted via DOM state)

## Implementation checklist (by layer/file)

- 🔲 `apps/trn-e2e/src/features/caregiver-authoring-happy-path.spec.ts`
- 🔲 `apps/trn-e2e/src/features/caregiver-authoring-llm-failure.spec.ts`
- 🔲 Verify `apps/trn-e2e/project.json` Nx targets are configured

**Tests**
- 🔲 `npx nx e2e trn-e2e` PASS for both specs (or PENDING if BE trn-service not wired)

## Milestone
Wave 9 / e2e + Hardening

## Labels
type:test
layer:frontend
scope:trn
priority:P9

## Acceptance criteria
- `caregiver-authoring-happy-path.spec.ts` asserts: session created, proposal in list, publication state reached.
- `caregiver-authoring-llm-failure.spec.ts` asserts: LLM-unavailable banner visible; proposal list unchanged (count unchanged).
- Real caregiver session used (not a mock bypass).
- `npx nx e2e trn-e2e` runs (may be pending/skipped if BE trn-service not available in CI).

## Dependencies
- FE-TRN-002 (TRN_ROUTES — routes under test)
- FE-TRN-023 (caregiverAuthoringGuard — real guard exercised)

## Data impact
- None — e2e test fixtures only.

## API / Contract impact
- Uses real or stubbed trn-service HTTP endpoints; LLM failure path requires HTTP intercept to inject 503.

## Testing / Evidence required
- `npx nx e2e trn-e2e --spec caregiver-authoring-happy-path` output showing PASS or PENDING.

## Risks / Notes
- If trn-service BE is not yet wired, mark specs as `@pending` with a TODO referencing INT-FE-TRN-1 and INT-FE-TRN-2.
