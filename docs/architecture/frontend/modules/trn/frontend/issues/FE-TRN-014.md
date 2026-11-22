# FE-TRN-014 -- feature-training routes + TrainingSessionPageComponent smart host (Screen 08, OnPush, standalone)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`libs/trn/feature-training/src/lib/training.routes.ts` exports the lazy child routes for `/training`, and `TrainingSessionPageComponent` is the smart OnPush standalone host for Screen 08 — injecting `TrainingSessionFacade`, `ProposalFacade`, `ConsentFacade`, and `AudioPreviewService` and reading all signals to compose `TrainingScreenVM`.

## Context / Problem statement
- SPEC-02 §1: `TrainingSessionPageComponent` is the smart host — it injects the four facades/services and reads their signals; it owns no `HttpClient`.
- Signals read: `sessionState()`, `messages()`, `llmState()`, `proposals()`, `dualConfirm(id)`, `consentState()`, `previewSource()`.
- SPEC-01 §3: route is `loadComponent` lazy under the `TRN_ROUTES` empty-path route with `caregiverAuthoringGuard`.

## Approach (execution path)
1. Create `libs/trn/feature-training/src/lib/training.routes.ts` with the internal route mapping (or leave this in `trn.routes.ts`; either approach is valid, but the smart component is loaded lazily).
2. Create `TrainingSessionPageComponent` as `@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })`.
3. Inject `TrainingSessionFacade`, `ProposalFacade`, `ConsentFacade`, `AudioPreviewService`.
4. Expose `vm = computed<TrainingScreenVM>(() => ({ sessionId: ..., sessionState: ..., messages: ..., llmState: ..., proposals: ..., consentState: ... }))`.
5. Wire child component `@Input` / event bindings: `(sendMessage)` → `trainingSessionFacade.sendDialogTurn(text)`, `(openAssent id)` → router.navigate(['assent']), `(endSession)` → `trainingSessionFacade.endSession()`.

## Non-goals
- No implementation of child components here (FE-TRN-015 through FE-TRN-018).
- No patient-session route registration.

## Layer(s)
frontend / Feature lib (`libs/trn/feature-training/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-01-route-map.md` (§1, §3)

## Architecture alignment
- Standalone + OnPush
- Smart component: inject facades, read signals; zero HttpClient
- `computed<TrainingScreenVM>()` is the single composition point

## Implementation checklist (by layer/file)

- 🔲 `feature-training/src/lib/training-session-page/training-session-page.component.ts` — smart host (standalone, OnPush)
- 🔲 `feature-training/src/lib/training-session-page/training-session-page.component.html` — template wires child components
- 🔲 Unit test: component renders `sessionState()` and `llmState()` from facade

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
- `TrainingSessionPageComponent` is `standalone: true` and `changeDetection: ChangeDetectionStrategy.OnPush`.
- Component injects facades, never `HttpClient` directly.
- `vm` is a `computed` signal composing `TrainingScreenVM`.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-011 (TrainingSessionFacade)
- FE-TRN-012 (ProposalFacade)
- FE-TRN-013 (ConsentFacade)
- FE-TRN-002 (TRN_ROUTES — route must exist before this component is lazy-loaded)

## Data impact
- None — read-only signal composition.

## API / Contract impact
- None — HTTP delegated to facades.

## Testing / Evidence required
- Unit test: smart component renders loading/active states from facade signals.

## Risks / Notes
- The `caregiverAuthoringGuard` gates this component; without FE-TRN-023 the route guard is a placeholder.
