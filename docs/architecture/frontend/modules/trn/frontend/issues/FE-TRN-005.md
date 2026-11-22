# FE-TRN-005 -- trn.bootstrap.ts lifecycle + view-model type definitions (ProposalVM, TrainingScreenVM, PatientAssentScreenVM, ConsentVM, PublicationVM)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`libs/trn/src/lib/trn.bootstrap.ts` implements the TRN module lifecycle (init/destroy) and `libs/trn/src/lib/models/` holds all five view-model types (`ProposalState`, `ProposalVM`, `TrainingScreenVM`, `PatientAssentScreenVM`, `ConsentVM`, `PublicationVM`) mirroring the BE data-model §2.2 and SPEC-03.

## Context / Problem statement
- SPEC-06 §3: `trn.bootstrap.ts` registers `TRN_MODULE_DESCRIPTOR`, wires `provideTrn({ adapter: 'http' })`, subscribes `TrnShellIntegrationService` to the optional `NAVIGATION_INTENT_PORT`, and reads consent gate lazily.
- Destroy: unsubscribes the intent port; clears only TRN's UI-local state. Never mutates proposal content, never deletes a pending proposal (drafts persist server-side — SPEC-03 §3).
- SPEC-03 §1: `ProposalState` is the verbatim BE enum (11 values); view-model types are signal-ready (no `BehaviorSubject`).

## Approach (execution path)
1. Create model files under `libs/trn/src/lib/models/`: `proposal.vm.ts` (ProposalState enum + ProposalVM interface), `training-screen.vm.ts` (TrainingScreenVM), `patient-assent-screen.vm.ts` (PatientAssentScreenVM), `consent.vm.ts` (ConsentVM), `publication.vm.ts` (PublicationVM, `ChatTurn`).
2. Types mirror SPEC-03 §1 exactly — no field renaming relative to BE data-model §2.2.
3. Create `libs/trn/src/lib/trn.bootstrap.ts` with `init()`: calls `moduleRegistry.register(TRN_MODULE_DESCRIPTOR)`, calls `provideTrn()`, subscribes to `NAVIGATION_INTENT_PORT` (no-op default).
4. `destroy()`: unsubscribes navigation intent; clears unsent draft message text from local storage only. Issues no proposal-state mutations.
5. Re-export model types from `src/index.ts`.

## Non-goals
- No background timers or polling in bootstrap (publication polling is facade-initiated on demand).
- No deletion of pending proposals on destroy (drafts persist server-side).

## Layer(s)
frontend / Tool entry + Domain models (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§1–§3)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-06-shell-integration.md` (§3)

## Architecture alignment
- View-model types are plain TypeScript interfaces (no classes, no decorators)
- Signal-ready: no Observables or BehaviorSubject in model layer
- ProposalState verbatim from BE data-model §2.2 (11 values)

## Implementation checklist (by layer/file)

**Lib path: `frontend/libs/trn/src/lib/models/`**
- 🔲 `proposal.vm.ts` — ProposalState (11 values), ProposalVM, ChatTurn
- 🔲 `training-screen.vm.ts` — TrainingScreenVM
- 🔲 `patient-assent-screen.vm.ts` — PatientAssentScreenVM
- 🔲 `consent.vm.ts` — ConsentVM
- 🔲 `publication.vm.ts` — PublicationVM

**Lib path: `frontend/libs/trn/src/lib/`**
- 🔲 `trn.bootstrap.ts` — init() / destroy() per SPEC-06 §3

**Tests**
- 🔲 Unit test: `ProposalState` enum has exactly 11 values matching SPEC-03 §1
- 🔲 Unit test: `destroy()` does not mutate any proposal state signal
- 🔲 `npx nx lint trn` PASS
- 🔲 `npx nx build trn` PASS

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- `ProposalState` matches BE data-model §2.2 exactly (11 values: draft, proposed, caregiver_approved, patient_approved, approved, synthesizing, indexed, published, rejected, withdrawn, erased).
- `trn.bootstrap.ts` destroy() issues no proposal-state mutations and no HTTP calls.
- `npx nx build trn` PASS with no TS errors.

## Dependencies
- FE-TRN-001 (trn.contract.ts for MODULE_KEY)
- FE-TRN-003 (provideTrn)

## Data impact
- None — model types and bootstrap lifecycle only.

## API / Contract impact
- None — no HTTP calls in model/bootstrap.

## Testing / Evidence required
- Unit test: ProposalState 11-value assertion.
- Build output: no TS errors.

## Risks / Notes
- If BE adds a new state later, `ProposalState` must be updated here and in SPEC-03.
