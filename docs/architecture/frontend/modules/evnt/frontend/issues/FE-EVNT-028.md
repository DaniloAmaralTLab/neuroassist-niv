# FE-EVNT-028 -- [SAFETY] DetectionLapseApiService + LapseAlertFacade (poll + acknowledge + auto-clear)

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/data-access/` gains `DetectionLapseApiService` (http adapter, base `${ACCESS_HTTP_BASE}/evnt`) and `LapseAlertFacade`. The facade POLLS `GET /evnt/patients/{id}/detection-lapses` REUSING the AlarmFacade monitoring model (server-advertised cadence, visibility/online, read-failure = degraded — NEVER a false "no lapses"), acknowledges via `POST /evnt/detection-lapses/{id}/confirmation`, applies emergency precedence (LAPSE-6) and auto-clears on server resolve.

## Context / Problem statement

- SPEC-04 §6: the lapse poll must reuse the SAME monitoring model/listeners as the alarm — one visibility/online stack, not a second (SPEC-06 §2).
- Read failure / paused / offline / stale → `MonitoringVM` degraded + hold last-known lapse state; "no lapses" is ONLY a read that returned an empty list (SPEC-04 §6.2, SPEC-07 §2.4).
- Acknowledge is ack-then-clear by default (await 200); optimistic clear only with a rollback that re-raises (SPEC-04 §6.4). Confirm body empty; `acknowledgedBy` server-trusted from JWT.
- Emergency precedence: `suppressedByEmergency=true` WHILE `AlarmVM.state='active'` (LAPSE-6); lapse held back, never promoted.
- Auto-clear: a lapse clears only from a read reporting `resolved`/`acknowledged`, never from a timer.

## Approach (execution path)

1) `DetectionLapseApiService`: `listDetectionLapses(patientId, status)` + `acknowledgeDetectionLapse(lapseId)` on `LAPSE_PORT` (http default / mock), base `${ACCESS_HTTP_BASE}/evnt`.
2) `LapseAlertFacade`: start the poll at the server-advertised interval (reuse the alarm's `pollIntervalSeconds` when the lapse page omits one); subscribe to the shared visibility/online state; expose `detectionLapseAlertVm()`.
3) Compute `suppressedByEmergency` from `AlarmFacade.activeEmergency`; never rank a lapse above an unconfirmed emergency.
4) Acknowledge: await `200`, then let the next read drop the lapse; on failure keep the alert active + offer retry; idempotent re-ack is a no-op (SPEC-04 §6.4, SPEC-07 §2.4).
5) Degradation: read fail/paused → `MonitoringVM` degraded, hold last-known; never emit a "no lapses" all-clear.

## Non-goals

- No UI components (FE-EVNT-029).
- No raise/resolve calls — service-client path, out of FE scope (SPEC-04 §6.5).
- No second visibility/connectivity listener stack (reuse the alarm's — SPEC-06 §2).

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §6
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4c

## Architecture alignment

- Reuse the AlarmFacade monitoring model (do not fork it)
- Adapter default http; live projection, never a store
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access**
- [ ] `libs/evnt/data-access/src/lib/detection-lapse.port.ts` (LAPSE_PORT InjectionToken)
- [ ] `libs/evnt/data-access/src/lib/detection-lapse-api.service.ts` (http adapter)
- [ ] `libs/evnt/data-access/src/lib/detection-lapse-mock.adapter.ts` (mock for dev/e2e)
- [ ] `libs/evnt/data-access/src/lib/lapse-alert.facade.ts` (poll + acknowledge + precedence + auto-clear)

**Tests**
- [ ] `npx nx test evnt` PASS (adopts server cadence; degraded read NEVER yields "no lapses"; suppressedByEmergency true under active emergency; ack-then-clear; idempotent re-ack; auto-clear on resolved read)
- [ ] `npx nx lint evnt` PASS (boundary: no second visibility stack)

## Milestone

Wave P2 / Data access

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P2
safety:detection-lapse

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- A failed/paused lapse read NEVER sets `DetectionLapseAlertVM.state` to a "no lapses" all-clear
- `suppressedByEmergency=true` WHILE an unconfirmed emergency is active
- A failed acknowledge keeps the alert active (not acknowledged)

## Dependencies

- FE-EVNT-027 (DetectionLapse wire + VM)
- FE-EVNT-009 (AlarmFacade — monitoring model reused)

## Tenant-context impact

Tenant switch invalidates the lapse projection (same as alarm).

## Risks / Notes

- SAFETY: the single most important invariant is "never claim no detection lapses when unable to poll" (SPEC-04 §6.2).

## Prioridade

P2
