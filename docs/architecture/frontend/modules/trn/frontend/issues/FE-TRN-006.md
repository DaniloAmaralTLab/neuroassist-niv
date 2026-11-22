# FE-TRN-006 -- TrainingSession adapters (HTTP + Mock) + wire mappers (TrainingSessionWire, toDomain)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`TrainingSessionHttpAdapter` and `TrainingSessionMockAdapter` implement `TRAINING_SESSION_PORT` behind `libs/trn/src/lib/ports/training-session.port.ts`, with wire types (`TrainingSessionWire`) mirroring the BE JSON and `.pipe(map(toTrainingSession))` mappers converting wire to domain.

## Context / Problem statement
- SPEC-04 §1: three operations — `POST /trn/sessions` (create), `GET /trn/sessions/{id}` (read), `POST /trn/sessions/{id}/dialog` (dialog turn). Base `${ACCESS_HTTP_BASE}/trn` (never `/api/v1`). No `X-Tenant-Id` header; tenant derived server-side.
- Mock adapter serves the same wire shape through the same mappers (not a shortcut).
- Base URL from `@neuroassist/shared/access-http-base` interceptors (correlation + error-normalize).
- Bloqueia: FE-TRN-011 (TrainingSessionFacade)

## Approach (execution path)
1. Create `libs/trn/src/lib/models/wire/training-session.wire.ts` with `TrainingSessionWire` mirroring BE JSON response for session + embedded proposals array.
2. Create `libs/trn/src/lib/mappers/training-session.mapper.ts` with `toTrainingSession(wire: TrainingSessionWire): TrainingSessionDomain` mapper.
3. Create `libs/trn/src/lib/ports/training-session.port.ts` defining `TrainingSessionPort` interface (create, getById, sendDialogTurn).
4. Create `libs/trn/src/lib/adapters/training-session-http.adapter.ts`: injects `HttpClient` + `ACCESS_HTTP_BASE` token; calls the three endpoints; `.pipe(map(toTrainingSession))`.
5. Create `libs/trn/src/lib/adapters/training-session-mock.adapter.ts`: serves fixtures in `TrainingSessionWire` shape through the same mapper.
6. Update `trn.providers.ts` to bind `TRAINING_SESSION_PORT` to the correct adapter.

## Non-goals
- No TrainingSessionFacade implementation here (FE-TRN-011).
- No `llm-unavailable` handling here — that is mapped at the error-handler level (FE-TRN-025).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/adapters/`, `libs/trn/src/lib/ports/`, `libs/trn/src/lib/mappers/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§1, §2, §3)
- `docs/architecture/frontend/modules/trn/frontend/contracts/backend-api-cross-link.md` (§1 — TRAINING_SESSION_PORT rows)

## Architecture alignment
- Base `${ACCESS_HTTP_BASE}/trn` — never hardcoded `/api/v1`
- `TrainingSessionWire` mirrors BE JSON exactly; `toTrainingSession` is the single conversion point
- Mock adapter uses same wire shape + same mapper (never bypasses a mapper)

## Implementation checklist (by layer/file)

- 🔲 `models/wire/training-session.wire.ts` — TrainingSessionWire
- 🔲 `mappers/training-session.mapper.ts` — toTrainingSession(wire) function
- 🔲 `ports/training-session.port.ts` — TrainingSessionPort interface + TRAINING_SESSION_PORT token
- 🔲 `adapters/training-session-http.adapter.ts` — HTTP adapter (create, getById, sendDialogTurn)
- 🔲 `adapters/training-session-mock.adapter.ts` — Mock adapter with fixture + same mapper

**Tests**
- 🔲 Unit test: `toTrainingSession` maps all fields; no field dropped
- 🔲 Unit test: Mock adapter returns mapped domain type (not raw wire)
- 🔲 `npx nx test trn` PASS
- 🔲 `npx nx lint trn` PASS
- 🔲 `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- HTTP adapter uses `${ACCESS_HTTP_BASE}/trn` as base; no `/api/v1`.
- Both HTTP and Mock adapters produce mapped domain types via `toTrainingSession` mapper.
- `npx nx build trn` PASS; `npx nx lint trn` PASS.

## Dependencies
- FE-TRN-003 (provideTrn — binds the port)

## Data impact
- None on the FE — read-only mapper; no local state mutated.

## API / Contract impact
- Consumes `POST /trn/sessions`, `GET /trn/sessions/{id}`, `POST /trn/sessions/{id}/dialog` (BE api-contract §2.1, §2.2, §3.1).

## Testing / Evidence required
- Unit test: mapper maps all wire fields; no field silently dropped.

## Risks / Notes
- `503 llm-unavailable` on dialog turn is mapped to `AppError` by the shared error-normalizer, not inside this adapter.
