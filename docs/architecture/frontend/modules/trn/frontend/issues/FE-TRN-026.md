# FE-TRN-026 -- Loading, empty, ended-pending, pending-synth states + erase modal (destructive confirm, trn.content.delete gate)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Loading, empty, ended-pending, and pending-synth UI states are wired to their respective `TrainingScreenVM`/`ProposalVM` signals; the `EraseConfirmModalComponent` provides the only TRN viewport takeover — a destructive confirm for `trn.content.delete`, hidden when the authority is absent.

## Context / Problem statement
- SPEC-03 §2: `pending-synth` is a state badge on `ProposedNodeCardComponent` (FE-TRN-017), not an error. Surface when `publication.status === 'pending'` or `state === 'synthesizing'`.
- SPEC-07 §5: modal for destructive erase only; no other TRN flow takes over the viewport.
- SPEC-05 §4: `trn.content.delete` absent → erase affordance hidden (not disabled).
- SPEC-03 §3: `sessionState === 'ended-pending'` → show a persistent "session ended with pending drafts" banner; pending proposals are not discarded.

## Approach (execution path)
1. Add loading skeleton to `TrainingSessionPageComponent` for `sessionState === 'loading'`.
2. Add empty state ("no active session — start one") for `sessionState === 'empty'`.
3. Add `ended-pending` banner for `sessionState === 'ended-pending'` listing the count of pending proposals.
4. Create `EraseConfirmModalComponent` (standalone, OnPush): triggered by an erase affordance (gated by `can('trn.content.delete')`); shows "This will permanently erase all voice content for this patient. This cannot be undone."; on confirm emits `(confirm patientId)` → `ContentFacade.erase(patientId)`.
5. Wire `pending-synth` badge in `ProposedNodeCardComponent` (FE-TRN-017) using `PublicationFacade.publicationStatus()`.

## Non-goals
- No pending-synth as an error (it is a state).
- No auto-retry of publication — polling is adapter-driven.

## Layer(s)
frontend / Feature lib + Tool entry (`libs/trn/feature-training/`, `libs/trn/feature-patient-assent/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§4, §5)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§2 pending-synth)

## Architecture alignment
- `pending-synth` is a state badge, not an error
- Modal only for destructive erase (SPEC-07 §5)
- Erase affordance hidden (not disabled) when authority absent

## Implementation checklist (by layer/file)

- 🔲 Loading skeleton in `TrainingSessionPageComponent` for `sessionState === 'loading'`
- 🔲 Empty state for `sessionState === 'empty'`
- 🔲 Ended-pending banner for `sessionState === 'ended-pending'`
- 🔲 `feature-training/src/lib/erase-confirm-modal/erase-confirm-modal.component.ts` — destructive confirm modal
- 🔲 Erase affordance gating: hidden when `can('trn.content.delete') === false`
- 🔲 Unit test: `pending-synth` badge renders when `publication.status === 'pending'`
- 🔲 Unit test: erase affordance absent when `can('trn.content.delete') === false`

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
- `ended-pending` banner is visible when `sessionState === 'ended-pending'`; pending proposals are listed.
- `EraseConfirmModalComponent` modal fires `(confirm)` only after user accepts the destructive-action warning.
- Erase affordance is hidden (not disabled) when `can('trn.content.delete') === false`.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-013 (ContentFacade — erase trigger)
- FE-TRN-014 (TrainingSessionPageComponent — loading/empty/ended-pending states)
- FE-TRN-017 (ProposedNodeCardComponent — pending-synth badge)

## Data impact
- None — rendering only.

## API / Contract impact
- Erase modal confirm triggers `ContentFacade.erase()` → `DELETE /trn/patients/{id}/content`.

## Testing / Evidence required
- Unit tests: pending-synth badge and erase-affordance-hidden scenarios.

## Risks / Notes
- Erase is irreversible — the modal warning text must be explicit ("cannot be undone").
