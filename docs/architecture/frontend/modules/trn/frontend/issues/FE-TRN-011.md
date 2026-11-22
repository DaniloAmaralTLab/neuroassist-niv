# FE-TRN-011 -- TrainingSessionFacade — sessionState(), messages(), llmState() signals; create, sendDialogTurn; optimistic update rules

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`TrainingSessionFacade` exposes `sessionState()`, `messages()`, and `llmState()` as `Signal<T>`-based readonly state, with `create(patientId)` and `sendDialogTurn(text)` write methods, optimistic LLM-state update on dialog turn, and honest `'error'` state on `503 llm-unavailable` without fabricating proposals.

## Context / Problem statement
- SPEC-03 §1: `TrainingScreenVM.llmState` has three values (`idle | responding | error`); a `503 llm-unavailable` resolves to `'error'` and a retry is by caregiver action only.
- SPEC-04 §4: LLM proposals are never optimistic — the FE renders only what `/dialog` returns; on `503` it shows an honest error and fabricates nothing.
- `messages()` accumulates `ChatTurn[]`; each `sendDialogTurn` appends to the signal (but only after a successful or errored server response).
- Bloqueia: FE-TRN-014 (TrainingSessionPageComponent)

## Approach (execution path)
1. Inject `TRAINING_SESSION_PORT` (not `HttpClient`).
2. Expose `sessionId = signal<string | null>(null)`, `sessionState = signal<TrainingScreenVM['sessionState']>('empty')`, `messages = signal<ChatTurn[]>([])`, `llmState = signal<'idle'|'responding'|'error'>('idle')`.
3. `create(patientId)`: POST → on success set sessionId + state `'active'`; on `404 patient-not-found` → banner, no session.
4. `sendDialogTurn(text)`: optimistically set `llmState('responding')`; POST `/dialog`; on success: append returned ChatTurns (caregiver + assistant) to `messages`; set `llmState('idle')`. On `503 llm-unavailable`: set `llmState('error')`; existing drafts preserved; no fabricated proposal.
5. `endSession()`: set `sessionState('ended-pending')`; no proposal deletion.
6. All reads from signals (`.asReadonly()` exposed publicly).

## Non-goals
- No proposal management here (ProposalFacade, FE-TRN-012).
- Retry of dialog turn is caregiver-initiated (re-call `sendDialogTurn`); no auto-retry.

## Layer(s)
frontend / Data access (`libs/trn/src/lib/facades/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§1, §3)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§3, §4)

## Architecture alignment
- Signals only (no Observables/BehaviorSubjects)
- LLM proposals never optimistic
- `'ended-pending'` state on session end — no proposal deletion

## Implementation checklist (by layer/file)

- 🔲 `facades/training-session.facade.ts` — sessionState, messages, llmState signals; create, sendDialogTurn, endSession
- 🔲 Unit test: `llmState === 'error'` on 503; messages unchanged (no fabricated proposal)
- 🔲 Unit test: `endSession()` sets `sessionState('ended-pending')` without issuing a DELETE

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `sendDialogTurn` on 503 sets `llmState('error')` and does NOT append a fabricated proposal to `messages`.
- `endSession()` sets `sessionState('ended-pending')` and does NOT issue any proposal DELETE.
- All signals exposed as `.asReadonly()`.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-006 (TrainingSession adapters)

## Data impact
- Local signal state only (no localStorage or indexedDB for authoritative state).

## API / Contract impact
- Delegates all HTTP calls to `TRAINING_SESSION_PORT`.

## Testing / Evidence required
- Unit test: llmState + messages state machine on 503 path.

## Risks / Notes
- Never fabricate a proposal on a 503 — this is a core safety invariant (SPEC-04 §4).
