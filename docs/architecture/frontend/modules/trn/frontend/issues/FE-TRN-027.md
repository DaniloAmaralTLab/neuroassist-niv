# FE-TRN-027 -- Telemetry — structured events for proposal-approved, session-ended, publication-completed, consent-captured (via @neuroassist/shared/observability)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`TrnTelemetryService` emits structured domain events (`proposal-approved`, `session-ended`, `publication-completed`, `consent-captured`) via `@neuroassist/shared/observability`, carrying the correlation ID from the Access-Layer response header; no PII (proposal text, patient name) in any payload.

## Context / Problem statement
- SPEC-07 §5: correlation via `@neuroassist/shared/observability` using Access-Layer correlation ID; no PII logged.
- Key domain events to instrument: a proposal is approved by the caregiver, the session ends, a publication completes (synthesized), consent is captured.
- Telemetry is decoupled from facades — facades call `telemetryService.track(eventName, metadata)` with safe identifiers only (IDs, states, counts — no text content).

## Approach (execution path)
1. Create `libs/trn/src/lib/telemetry/trn-telemetry.service.ts`.
2. Inject `ObservabilityService` from `@neuroassist/shared/observability`.
3. Implement `track(event: TrnTelemetryEvent, metadata: TrnTelemetryMeta)`: delegates to `observability.emit(event, metadata)`.
4. `TrnTelemetryMeta` carries: `sessionId`, `proposalId?`, `publicationId?`, `state?`, `correlationId` (from Access-Layer header). No `text`, no `patientName`, no PII.
5. Wire in facades: `ProposalFacade.approve()` → `telemetry.track('proposal-approved', ...)` on success; `TrainingSessionFacade.endSession()` → `telemetry.track('session-ended', ...)`.
6. `ContentFacade.erase()` does NOT emit telemetry (erasure events are BE-authoritative via audit service).

## Non-goals
- No PII (proposal text, patient name) in any telemetry payload.
- No telemetry for internal adapter state changes (only domain outcomes).

## Layer(s)
frontend / Tool entry (`libs/trn/src/lib/telemetry/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§5 — correlation and observability)

## Architecture alignment
- `@neuroassist/shared/observability` as telemetry sink (correlation-id-scoped)
- No `console.log`; no PII in event payloads

## Implementation checklist (by layer/file)

- 🔲 `libs/trn/src/lib/telemetry/trn-telemetry.service.ts` — 4 event types, PII-free payloads
- 🔲 `libs/trn/src/lib/telemetry/trn-telemetry-event.type.ts` — `TrnTelemetryEvent` union + `TrnTelemetryMeta` interface
- 🔲 Unit test: `track('proposal-approved', ...)` calls `observability.emit` with PII-free metadata
- 🔲 Unit test: metadata does NOT include `text` or `patientName` fields

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 8 / Observability

## Labels
type:feature
layer:frontend
scope:trn
priority:P8

## Acceptance criteria
- `TrnTelemetryMeta` type does NOT define `text` or `patientName` fields (TypeScript compile check).
- `track('proposal-approved', ...)` calls `observability.emit` on the shared observability service.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-011 (TrainingSessionFacade — wiring point)
- FE-TRN-012 (ProposalFacade — wiring point)

## Data impact
- None — telemetry is fire-and-forget; no client-side state mutation.

## API / Contract impact
- None — telemetry goes through `@neuroassist/shared/observability`, not directly to any BE endpoint.

## Testing / Evidence required
- Unit test: PII exclusion from TrnTelemetryMeta (TypeScript type check + runtime assertion).

## Risks / Notes
- If `@neuroassist/shared/observability` is not yet available, create a stub that buffers and no-ops until the service lands.
