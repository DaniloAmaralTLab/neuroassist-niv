# INT-FE-EVNT-005 -- HIST audit hand-off via @neuroassist/shared/observability

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

EVNT telemetry events (`alarm-raised-shown`, `alarm-acknowledged`, `mark-not-real`) are forwarded to the HIST audit trail via `@neuroassist/shared/observability`. EVNT NEVER calls HIST directly. The observability service handles the forwarding and enriches the event with `tenantId` and `sessionId`.

## Context / Problem statement

- HIST owns the audit trail — EVNT must not couple to it directly (carry-forward `fe-audit:direct-hist-call`, `contracts/backend-api-cross-link.md` §INT-FE-EVNT-005).
- `@neuroassist/shared/observability` is the decoupling layer: EVNT emits typed events; the shared observability service batches and forwards them to the HIST/audit endpoint.
- If the HIST endpoint is unavailable, the observability service handles retries — EVNT does not need to care.
- This issue verifies the hand-off contract: EVNT's telemetry event types are compatible with the shared observability event schema.

## Approach (execution path)

1. In `evnt-telemetry.service.ts` (FE-EVNT-023): `inject(ObservabilityService).track(...)` with the typed EVNT event.
2. `ObservabilityService` (from `@neuroassist/shared/observability`) enriches with `tenantId`, `sessionId` from `TenantContext` and `AuthSession` and forwards to HIST.
3. Integration test: mock `ObservabilityService`, verify that `track()` is called with the correct event type and correlationId when `AlarmFacade.confirmAlarm()` succeeds.
4. Confirm that EVNT has NO import of `@neuroassist/hist` or `HistService`.

## Non-goals

- No HIST direct call from EVNT.
- No retry logic in EVNT.

## Layer(s)

frontend / domain (`libs/evnt/domain/`) + integration

## Bounded context

evnt (integration with HIST via shared)

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/contracts/backend-api-cross-link.md` §INT-FE-EVNT-005

## Architecture alignment

- Decoupled via @neuroassist/shared/observability
- No @neuroassist/hist import in EVNT
- Tag Nx: `scope:evnt`, `type:integration`

## Implementation checklist (by file)

**Domain / integration**
- [ ] `libs/evnt/domain/src/lib/evnt-telemetry.service.ts` (uses ObservabilityService — no HistService import)
- [ ] `libs/evnt/domain/src/lib/evnt-telemetry.types.ts` (typed events, correlationId required)

**Tests**
- [ ] `npx nx test evnt` PASS (ObservabilityService.track called on acknowledge; no HistService in evnt module graph)
- [ ] `npx nx lint evnt` PASS (Nx tag boundary: scope:evnt cannot import scope:hist)

## Milestone

Wave P8 / Observability

## Labels

type:integration
layer:frontend
scope:evnt
priority:P8

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx graph --file=... | grep hist` → no HIST module in EVNT dependency graph
- Nx lint boundary rule: `scope:evnt` CANNOT import `scope:hist` (checked via `.eslintrc.json` boundaries)

## Dependencies

- FE-EVNT-023 (evnt-telemetry.service.ts)

## Tenant-context impact

Observability service enriches with tenantId from TenantContext.

## Risks / Notes

- Carry-forward `fe-audit:direct-hist-call`: failing to enforce this boundary causes EVNT to depend on HIST's internal API, breaking the hexagonal boundary.

## Prioridade

P8
