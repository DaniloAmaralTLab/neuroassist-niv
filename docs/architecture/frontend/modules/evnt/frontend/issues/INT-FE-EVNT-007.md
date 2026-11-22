# INT-FE-EVNT-007 -- evnt-service detection-lapse HTTP adapter integration (list + confirm)

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

The EVNT FE `LAPSE_PORT` defaults to the HTTP adapter against the live `evnt-service` detection-lapse caregiver endpoints (`GET /evnt/patients/{id}/detection-lapses` §11, `POST /evnt/detection-lapses/{id}/confirmation` §12), based at `${ACCESS_HTTP_BASE}/evnt`, with authorities pinned exactly to the BE constants. The service-client raise/resolve endpoints are asserted ABSENT from the adapter surface.

## Context / Problem statement

- Carry-forward (ev=7): providers must default to `http`, not mock (`scaffold:mock-adapter-default`) — the lapse adapter follows the same rule as `EVENT_PORT`/`PUSH_PORT`.
- Authorities exact (INV-EVNT-7): `evnt.detection-lapse.read` (list) + `evnt.detection-lapse.confirm` (acknowledge). The adapter MUST NOT expose `create`/`resolve` (service-client `edge-service` path — SPEC-04 §6.5).
- Base path is the gateway prefix `/evnt` (NOT `/api/v1`) with the bearer + correlation-id interceptor (carry-forward `http-adapter:wrong-prefix`).
- Contract pin: `backend_contract` points at `evnt-service/contracts/api-contract.md` §10–12 for the detection-lapse surface.

## Approach (execution path)

1) Register `LAPSE_PORT` → `DetectionLapseApiService` (http) as the default in `evnt.providers.ts`; mock only under an explicit mock provider.
2) Integration test: `LAPSE_PORT instanceof DetectionLapseHttpAdapter` without overrides; base `${ACCESS_HTTP_BASE}/evnt`.
3) Assert the adapter exposes only `listDetectionLapses` + `acknowledgeDetectionLapse` — no raise/resolve method.
4) Assert authority strings equal the BE constants exactly (no rename).
5) Pin the backend contract reference for drift detection.

## Non-goals

- No facade/poll logic (FE-EVNT-028).
- No UI (FE-EVNT-029).
- No service-client raise/resolve method on the adapter.

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`) + integration

## Bounded context

evnt (integration with evnt-service)

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §2/§6
- `docs/architecture/frontend/modules/evnt/frontend/contracts/backend-api-cross-link.md` §1

## Architecture alignment

- Adapter default http; base `${ACCESS_HTTP_BASE}/evnt`; authorities exact (INV-EVNT-7)
- Service-client raise/resolve excluded from the dashboard adapter
- Tag Nx: `scope:evnt`, `type:integration`

## Implementation checklist (by file)

**Data access / providers**
- [ ] `libs/evnt/data-access/src/lib/evnt.providers.ts` (register LAPSE_PORT → http default)
- [ ] `libs/evnt/data-access/src/lib/detection-lapse-api.service.spec.ts` (integration: http default; base prefix; authorities exact; no raise/resolve)

**Tests**
- [ ] `npx nx test evnt` PASS (LAPSE_PORT default = http; no create/resolve method; authority strings == BE constants)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:integration
layer:frontend
scope:evnt
priority:P2
safety:detection-lapse

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `LAPSE_PORT` resolves to the HTTP adapter without overrides (default http proven)
- The adapter exposes `listDetectionLapses` + `acknowledgeDetectionLapse` and NO raise/resolve method
- Authority strings equal `evnt.detection-lapse.read` / `evnt.detection-lapse.confirm` exactly

## Dependencies

- FE-EVNT-028 (DetectionLapseApiService + LapseAlertFacade)
- INT-FE-EVNT-001 (evnt-service HTTP adapter integration)

## Tenant-context impact

Tenant derived server-side from the JWT (INV-EVNT-1); never sent as a header.

## Risks / Notes

- Pitfall tracker: mock-adapter-default would silently return stub lapses in production.

## Prioridade

P2
