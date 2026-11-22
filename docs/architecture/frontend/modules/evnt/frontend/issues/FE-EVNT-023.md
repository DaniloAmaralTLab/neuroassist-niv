# FE-EVNT-023 -- Telemetry via @neuroassist/shared/observability

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

EVNT emits structured telemetry events via `@neuroassist/shared/observability` for key caregiver actions: `alarm-raised-shown`, `alarm-acknowledged`, `mark-not-real`, `push-enroll`, `push-disable`. All events carry a `correlationId`. No PII. No HIST direct calls.

## Context / Problem statement

- Telemetry enables product analytics and audit-trail seeding without coupling EVNT to HIST (SPEC-02 §4, contracts/backend-api-cross-link.md §INT-FE-EVNT-005).
- EVNT never calls HIST directly — it emits events via `@neuroassist/shared/observability` which the shared layer forwards (carry-forward `fe-audit:direct-hist-call`).
- `correlationId` from the alarm event must be carried in all telemetry events for correlation.
- No PII in telemetry (caregiver name, patient name, phone not included — only IDs).
- The `alarm-raised-shown` event fires when `AlarmVM.state='active'` renders for the first time in a session (not every render).

## Approach (execution path)

1. Create `evnt-telemetry.service.ts`: thin wrapper over `inject(ObservabilityService)`.
2. Event definitions (typed events, no raw strings):
   - `alarm-raised-shown`: `{ eventId, patientId, correlationId }`
   - `alarm-acknowledged`: `{ eventId, patientId, correlationId, duration_ms }`
   - `mark-not-real`: `{ eventId, correlationId }`
   - `push-enroll`: `{ channelType: 'web-push', result: 'success' | 'denied' | 'blocked' }`
   - `push-disable`: `{ channelType: 'web-push' }`
3. Emit from smart components / facades at the appropriate call site, NOT from presentational components.
4. `alarm-raised-shown` guard: emit only once per session per `eventId` (deduplicate with a `Set`).

## Non-goals

- No direct HIST calls.
- No caregiver or patient names in payloads.

## Layer(s)

frontend / domain (`libs/evnt/domain/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/contracts/backend-api-cross-link.md` §INT-FE-EVNT-005

## Architecture alignment

- Calls `@neuroassist/shared/observability`, never HIST directly
- No PII in events
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Domain layer**
- [ ] `libs/evnt/domain/src/lib/evnt-telemetry.service.ts`
- [ ] `libs/evnt/domain/src/lib/evnt-telemetry.types.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (alarm-raised-shown deduplicated; push-enroll emits result; no PII in payload; no HIST calls)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P8 / Observability

## Labels

type:domain
layer:frontend
scope:evnt
priority:P8

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `alarm-raised-shown` emitted only once per session per `eventId`
- All events include `correlationId`
- No caregiver or patient name fields in any telemetry payload
- No import of HIST services or modules

## Dependencies

- FE-EVNT-009 (AlarmFacade — emit on state=active)
- INT-FE-EVNT-005 (observability hand-off contract)

## Tenant-context impact

Events are tenant-scoped by JWT claim (handled by `@neuroassist/shared/observability`).

## Risks / Notes

- Carry-forward `fe-audit:direct-hist-call`: never import or inject a HIST service from EVNT.

## Prioridade

P8
