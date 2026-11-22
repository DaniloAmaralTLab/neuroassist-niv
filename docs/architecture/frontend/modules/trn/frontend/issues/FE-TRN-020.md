# FE-TRN-020 -- PendingAssentListComponent + AssentNodeCardComponent + ChannelBadgeComponent + ScanCursorComponent — large targets, three-channel convergence

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Four presentational components for Screen 09: `PendingAssentListComponent` (list of caregiver_approved proposals), `AssentNodeCardComponent` (Confirm/Adjust/Reject with large targets), `ChannelBadgeComponent` (active channel indicator), and `ScanCursorComponent` (switch-scan cursor with dwell/scan timing from NavigationService).

## Context / Problem statement
- SPEC-02 §2: `PendingAssentListComponent` takes `@Input pending: ProposalVM[]`, `@Input activeChannel`; emits `(confirm id)`, `(adjust id)`, `(reject id)`.
- `AssentNodeCardComponent` renders large-target tiles (ALS/MND accessibility, `@neuroassist/shared/ui-tokens` large-target tokens).
- `ChannelBadgeComponent` shows "Active channel: touch | gesture | switch-scan".
- `ScanCursorComponent` renders the switch-scan cursor affordance; timing driven by `NavigationService` (reused from CONV).
- Adjust in v1 → routes back to caregiver refine (PATCH, re-enters approval) — INT-FE-TRN-2.

## Approach (execution path)
1. Create `PendingAssentListComponent` (standalone, OnPush): `@Input pending`, `@Input activeChannel`; re-emits `(confirm id)`, `(adjust id)`, `(reject id)`.
2. Create `AssentNodeCardComponent` (standalone, OnPush): `@Input proposal: ProposalVM`; large-target Confirm, Adjust, Reject affordances. Confirm and Adjust emit to parent; Reject emits to parent.
3. `AssentNodeCardComponent`: no free-text input; Adjust in v1 emits `(adjust id)` → parent routes to caregiver PATCH flow (re-approval).
4. Create `ChannelBadgeComponent` (standalone, OnPush): `@Input activeChannel: 'touch' | 'gesture' | 'switch-scan'`.
5. Create `ScanCursorComponent` (standalone, OnPush): reads scan timing from `NavigationService`; renders a dwell cursor overlay.

## Non-goals
- No free-text input for patient on Adjust (INT-FE-TRN-2 tracks the future variations endpoint).
- No `AssentEvidenceFormComponent` here (FE-TRN-021).

## Layer(s)
frontend / Feature lib (`libs/trn/feature-patient-assent/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§2)

## Architecture alignment
- Large-target tiles using `@neuroassist/shared/ui-tokens` ALS/MND tokens
- Standalone + OnPush (all four components)
- Adjust = caregiver refine (PATCH) in v1 — no patient free-text

## Implementation checklist (by layer/file)

- 🔲 `feature-patient-assent/src/lib/pending-assent-list/pending-assent-list.component.ts`
- 🔲 `feature-patient-assent/src/lib/pending-assent-list/assent-node-card.component.ts` — large-target Confirm/Adjust/Reject
- 🔲 `feature-patient-assent/src/lib/channel-badge/channel-badge.component.ts`
- 🔲 `feature-patient-assent/src/lib/scan-cursor/scan-cursor.component.ts`
- 🔲 Unit test: `AssentNodeCardComponent` renders 3 large-target affordances

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
- `AssentNodeCardComponent` renders Confirm, Adjust, Reject affordances as large targets (min touch target size per design tokens).
- Adjust affordance does NOT show a free-text input (v1 → caregiver PATCH).
- `ScanCursorComponent` reads timing from `NavigationService` (not hardcoded).
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-019 (PatientAssentPageComponent — parent)
- FE-TRN-005 (ProposalVM type)

## Data impact
- None — read-only rendering.

## API / Contract impact
- None — actions delegated via parent.

## Testing / Evidence required
- Unit tests: card renders 3 affordances; adjust emits without free-text.

## Risks / Notes
- INT-FE-TRN-2: when a variations endpoint lands, `AssentNodeCardComponent.Adjust` can offer short suggestions instead of routing to PATCH.
