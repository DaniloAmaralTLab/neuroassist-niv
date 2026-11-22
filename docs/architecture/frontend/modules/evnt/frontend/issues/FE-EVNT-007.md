# FE-EVNT-007 -- EventApiService HTTP adapter — caregiver endpoints, wire types, EVENT_PORT

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/api/` contains all wire type interfaces (mirroring BE 1:1), `EventHttpAdapter` backed by `${ACCESS_HTTP_BASE}/evnt`, `EventMockAdapter` for tests, and an `EVENT_PORT` InjectionToken. The base path is `/evnt` (not `/api/v1`). No `HttpClient` import in components.

## Context / Problem statement

- Carry-forward `http-adapter:wrong-prefix`: base path MUST be `${ACCESS_HTTP_BASE}/evnt` (the gateway prefix), never `/api/v1` (SPEC-04 header).
- Carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`: wire types must mirror BE records 1:1 — no extra fields, no missing fields.
- The dashboard consumes only caregiver paths (§3–§5); `POST /evnt/gesture-reports` is out of FE scope (G-EVNT-5).
- Bearer token + correlationId flow via the shared interceptor — not set manually here.
- Bloqueia: FE-EVNT-008 (mappers operate on wire types), FE-EVNT-009 (AlarmFacade calls service)

## Approach (execution path)

1. Create `libs/evnt/api/src/lib/event.wire.ts` with all wire interfaces from SPEC-04 §3: `ActiveAlarmEnvelopeWire`, `AlarmEventWire`, `PatientEventsPageWire`, `EventRowWire`, `ConfirmationResultWire`, `FeedbackRequestWire`, `FeedbackResultWire`, `EscalationAttemptWire`, `EscalationTrailWire`.
2. Create `libs/evnt/api/src/lib/event.port.ts` with `EVENT_PORT: InjectionToken<EventPort>` and `EventPort` interface.
3. Create `EventHttpAdapter` calling all 6 operations via `HttpClient` injected from `@neuroassist/shared/access-http-base`. Base: `${ACCESS_HTTP_BASE}/evnt`.
4. Create `EventMockAdapter` serving the same operations with in-memory fixtures using the same wire types.
5. Confirm body: empty `{}` (not `{caregiverId}` — G-EVNT-2, INV-EVNT-1). Feedback body: `{verdict}` only.
6. Export from `libs/evnt/api/src/index.ts`.

## Non-goals

- No mappers — that is FE-EVNT-008.
- No facade — that is FE-EVNT-009.
- No PushSubscription adapter — that is FE-EVNT-010.

## Layer(s)

frontend / data-access (`libs/evnt/api/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §1–§4
- `docs/architecture/frontend/modules/evnt/frontend/contracts/backend-api-cross-link.md` §1

## Architecture alignment

- No HttpClient in components (port-and-adapter pattern)
- Carry-forward `http-adapter:wrong-prefix` — base /evnt, not /api/v1
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access layer**
- [ ] `libs/evnt/api/src/lib/event.wire.ts`
- [ ] `libs/evnt/api/src/lib/event.port.ts`
- [ ] `libs/evnt/api/src/lib/event-http.adapter.ts`
- [ ] `libs/evnt/api/src/lib/event-mock.adapter.ts`
- [ ] `libs/evnt/api/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (HTTP adapter: each operation calls correct endpoint; confirm body is `{}`; feedback body is `{verdict}`)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P2

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- `EventHttpAdapter` base URL = `${ACCESS_HTTP_BASE}/evnt` (spec assertion)
- Confirm request body = `{}` (not `{caregiverId}`) — INV-EVNT-1
- Feedback request body = `{verdict}` only — `http-adapter:request-body-field-whitelist`
- `evnt.event.ingest` / `POST /evnt/gesture-reports` not in the adapter

## Dependencies

- INT-FE-EVNT-004 (shared layer wiring: access-http-base, interceptor)

## Tenant-context impact

Tenant resolved server-side from JWT `sub`/claims — the HTTP adapter never sends `X-Tenant-Id` (INV-EVNT-1).

## Risks / Notes

- Carry-forward: wrong base path `/api/v1` has been a recurring defect in other modules.

## Prioridade

P2
