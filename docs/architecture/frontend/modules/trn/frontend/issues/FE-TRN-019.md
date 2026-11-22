# FE-TRN-019 -- feature-patient-assent routes + PatientAssentPageComponent smart host (Screen 09, OnPush, standalone, caregiver session)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`PatientAssentPageComponent` is the smart OnPush standalone host for Screen 09, running under the caregiver session, injecting `ProposalFacade`, `NavigationService` (switch-scan), and `AudioPreviewService`, and reading `pending()`, `activeChannel()`, and `recordState()` signals to compose `PatientAssentScreenVM`.

## Context / Problem statement
- SPEC-02 §2: smart host injecting three services; `pending()` = proposals in `caregiver_approved`; three input channels (touch, gesture via `NAVIGATION_INTENT_PORT`, switch-scan) converge on the same ProposalFacade write methods.
- SPEC-01 §2: runs entirely under the caregiver session; no patient-session token ever presented to `/trn`.
- G1 (optional): the assent surface is host-portable — `NAVIGATION_INTENT_PORT` with no-op default, large targets, switch-scan via `NavigationService`.

## Approach (execution path)
1. Create `PatientAssentPageComponent` (standalone, OnPush).
2. Inject `ProposalFacade`, `NavigationService` (switch-scan timing from CONV model, reused), `AudioPreviewService`.
3. `vm = computed<PatientAssentScreenVM>(() => ({ pending: proposalFacade.pending(), activeChannel: navigationService.activeChannel(), recordState: ... }))`.
4. All three channel inputs converge on `proposalFacade.recordPatientAssent(id, payload)`, `proposalFacade.reject(id)` — no channel-specific fork of state.
5. `NAVIGATION_INTENT_PORT` intent resolves to the pending-assent node with matching `engineFeatureRef`; if none, ignored.

## Non-goals
- No implementation of child components here (FE-TRN-020, FE-TRN-021).
- No second identity — caregiver token only.

## Layer(s)
frontend / Feature lib (`libs/trn/feature-patient-assent/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§2)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-01-route-map.md` (§1 — assent route)

## Architecture alignment
- Standalone + OnPush
- Three channels → same `ProposalFacade` write (no channel fork)
- Caregiver session only (no patient-session token)

## Implementation checklist (by layer/file)

- 🔲 `feature-patient-assent/src/lib/patient-assent-page/patient-assent-page.component.ts` — smart host (standalone, OnPush)
- 🔲 Template: wires child components, routes channel intents to ProposalFacade
- 🔲 Unit test: all three channels call `proposalFacade.recordPatientAssent` with same payload

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 3 / Feature lib (patient-assent)

## Labels
type:feature
layer:frontend
scope:trn
priority:P3

## Acceptance criteria
- Component runs under the caregiver session (no patient-session token injection).
- Touch, gesture, and switch-scan channels call the same `ProposalFacade.recordPatientAssent()` method.
- `NAVIGATION_INTENT_PORT` intent targeting a non-pending-assent node is ignored.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-012 (ProposalFacade — pending() signal)
- FE-TRN-002 (TRN_ROUTES — assent sub-route)

## Data impact
- None — read-only signal composition.

## API / Contract impact
- None — HTTP delegated to ProposalFacade.

## Testing / Evidence required
- Unit test: channel convergence on ProposalFacade.

## Risks / Notes
- G1 (INT-FE-TRN-6): if the assent surface is later mounted in the Patient-Mode host, the host overrides `NAVIGATION_INTENT_PORT`. No v1 work needed.
