# FE-TRN-017 -- ProposedNodeListComponent + ProposedNodeCardComponent — dual-confirm indicator, lifecycle badges, approval/edit/reject/preview/assent/publish affordances

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ProposedNodeListComponent` renders the list of `ProposalVM[]` with per-node lifecycle badges and a dual-confirm indicator (caregiver ✓/⏳ · patient ✓/⏳); `ProposedNodeCardComponent` renders each node's Approve, Edit, Reject, Preview, "Capture patient assent", and Publish affordances, each gated by `proposal.state` and the authority-gated RBAC rules from SPEC-05 §4.

## Context / Problem statement
- SPEC-02 §1: `ProposedNodeListComponent` takes `@Input proposals: ProposalVM[]` and emits six outputs; `ProposedNodeCardComponent` is per-node.
- SPEC-05 §4 RBAC-of-UI: Approve + Capture patient assent require `trn.proposal.approve`; Publish requires `trn.publication.create`; Edit + dialog require `trn.proposal.update`; Reject requires `trn.proposal.reject`.
- Lifecycle badge: `draft | proposed | caregiver-approved | patient-approved | approved | pending-synth | published | rejected | withdrawn | erased`.
- "Capture patient assent" button navigates to `/training/assent` via `(openAssent id)` output.

## Approach (execution path)
1. Create `ProposedNodeListComponent` (standalone, OnPush): `@Input proposals: ProposalVM[]`; emits `(approve id)`, `(edit id,text)`, `(reject id)`, `(preview id)`, `(openAssent id)`, `(publish id)`.
2. Create `ProposedNodeCardComponent` (standalone, OnPush): `@Input proposal: ProposalVM`; re-emits the six outputs.
3. Dual-confirm indicator: use `proposal.caregiverConfirmed` and `proposal.patientConfirmed` to render ✓/⏳ icons.
4. RBAC gating: each affordance calls `accessDecision.can('trn.proposal.approve')` etc. via `@neuroassist/shared/access-decision` (Wave-0 stub).
5. `pending-synth` lifecycle badge: rendered when `publication.status === 'pending'` or `proposal.state === 'synthesizing'` (SPEC-03 §2).

## Non-goals
- No implementation of RBAC/access-decision (FE-TRN-023 / PLATFORM stub).
- No audio preview logic here (FE-TRN-018 AudioPreviewButtonComponent).

## Layer(s)
frontend / Feature lib (`libs/trn/feature-training/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-05-tool-contract.md` (§4 RBAC-of-UI)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§2 lifecycle-status axis)

## Architecture alignment
- Standalone + OnPush (both components)
- RBAC gating via `access-decision.can()` (never hardcoded visible/hidden without an authority check)
- `pending-synth` is a state badge, not an error

## Implementation checklist (by layer/file)

- 🔲 `feature-training/src/lib/proposed-node-list/proposed-node-list.component.ts` — list host
- 🔲 `feature-training/src/lib/proposed-node-list/proposed-node-card.component.ts` — per-node card with 6 affordances
- 🔲 Dual-confirm indicator: caregiver ✓/⏳ · patient ✓/⏳ per card
- 🔲 Lifecycle badge for all 11 ProposalState values
- 🔲 Unit test: Publish affordance hidden when `can('trn.publication.create') === false`
- 🔲 Unit test: "Capture patient assent" button appears only when `state === 'caregiver_approved'`

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 3 / Feature lib (training)

## Labels
type:feature
layer:frontend
scope:trn
priority:P3

## Acceptance criteria
- Publish affordance is hidden (not disabled) when `can('trn.publication.create') === false`.
- Approve + "Capture patient assent" affordances are disabled when `can('trn.proposal.approve') === false`.
- Dual-confirm indicator reflects `caregiverConfirmed` and `patientConfirmed` from `ProposalVM`.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-005 (ProposalVM type)
- FE-TRN-014 (parent TrainingSessionPageComponent)

## Data impact
- None — read-only rendering.

## API / Contract impact
- None — proposal actions delegated via parent outputs to ProposalFacade.

## Testing / Evidence required
- Unit tests: RBAC gating for Publish and Approve affordances.

## Risks / Notes
- `access-decision` is a Wave-0 stub (INT-FE-TRN-5) — RBAC gating is permissive until PLATFORM ledger item lands. Never hardcode `true` as the can-check result.
