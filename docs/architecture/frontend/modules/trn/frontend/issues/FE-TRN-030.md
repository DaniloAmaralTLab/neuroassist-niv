# FE-TRN-030 -- e2e: patient-assent-touch.feature + patient-assent-switch-scan.feature (caregiver session, three-channel convergence, AssentEvidenceForm)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Two Playwright e2e specs covering Screen 09: `patient-assent-touch.feature` asserts the touch-channel assent capture flow (pending proposals listed, AssentEvidenceForm submitted, distinct-actor validation error on same actor); `patient-assent-switch-scan.feature` asserts that the switch-scan channel reaches the same ProposalFacade write method.

## Context / Problem statement
- SPEC-08 §3: patient-assent touch and switch-scan are distinct scenarios.
- Both run under the caregiver session (single identity — no patient token).
- Touch path: navigate to `/training/assent` → pending proposals listed → open `AssentEvidenceFormComponent` → submit with same caregiver actor → assert inline error → resubmit with distinct actor → assert `(record)` emitted.
- Switch-scan path: use `NavigationService` to advance cursor to a pending-assent node → trigger confirm → assert `proposalFacade.recordPatientAssent` called.

## Approach (execution path)
1. Create `apps/trn-e2e/src/features/patient-assent-touch.spec.ts`:
   - Setup: caregiver session, session with 1 caregiver-approved proposal.
   - Navigate to `/training/assent`.
   - Assert `PendingAssentListComponent` renders 1 node.
   - Open `AssentEvidenceFormComponent` for that node.
   - Submit with `confirmedBy = caregiverSubject` → assert inline "distinct person" error.
   - Resubmit with `confirmedBy = "guardian-name"` → assert success.
2. Create `apps/trn-e2e/src/features/patient-assent-switch-scan.spec.ts`:
   - Setup: same as above.
   - Simulate switch-scan advance (via `NavigationService.advanceCursor()`).
   - Dwell on the target node → assert `AssentNodeCardComponent` Confirm affordance receives focus.
   - Trigger confirm → assert `recordPatientAssent` call.

## Non-goals
- No gesture-channel test (covered by INT-FE-TRN-6 when G1 lands).

## Layer(s)
frontend / e2e (`apps/trn-e2e/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§3)

## Architecture alignment
- Caregiver session only (no patient token)
- Switch-scan via `NavigationService` test helper
- Distinct-actor validation exercised via UI (not just unit)

## Implementation checklist (by layer/file)

- 🔲 `apps/trn-e2e/src/features/patient-assent-touch.spec.ts` — same-actor error + distinct-actor success
- 🔲 `apps/trn-e2e/src/features/patient-assent-switch-scan.spec.ts` — cursor advance + confirm
- 🔲 NavigationService test helper for switch-scan simulation

**Tests**
- 🔲 `npx nx e2e trn-e2e` PASS for both specs

## Milestone
Wave 9 / e2e + Hardening

## Labels
type:test
layer:frontend
scope:trn
priority:P9

## Acceptance criteria
- Touch spec: same-actor submit → inline error shown, no `(record)` emitted.
- Touch spec: distinct-actor submit → `(record)` emitted and proposal transitions state.
- Switch-scan spec: cursor advance selects the pending-assent node and confirm triggers `recordPatientAssent`.
- `npx nx e2e trn-e2e` runs for both specs.

## Dependencies
- FE-TRN-019 (PatientAssentPageComponent)
- FE-TRN-021 (AssentEvidenceFormComponent — distinct-actor validation)

## Data impact
- e2e test fixtures only.

## API / Contract impact
- `POST /trn/proposals/{id}/patient-assent`.

## Testing / Evidence required
- Both specs PASS or PENDING with descriptive pending message.

## Risks / Notes
- Switch-scan timing depends on `NavigationService` dwell interval — set to a minimal value in e2e config.
