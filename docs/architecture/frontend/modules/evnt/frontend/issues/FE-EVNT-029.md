# FE-EVNT-029 -- [SAFETY] feature-lapse — DetectionLapseAlert + Card + EmptyState

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/feature-lapse/` contains `DetectionLapseAlertComponent` (smart), `DetectionLapseCardComponent` and `DetectionLapseEmptyStateComponent` (presentational). It renders the DISTINCT "station not detecting" alert on an embedded surface — NEVER the emergency takeover — with an acknowledge affordance gated by `evnt.detection-lapse.confirm`, held back WHILE an emergency outranks it, and an empty state shown only after a positive no-lapse read.

## Context / Problem statement

- SPEC-02 §2b / SPEC-03 §4c: the lapse alert is an ARIA `status`/`alert` region (NOT an `alertdialog`) so it never seizes focus from or competes with a real emergency takeover (LAPSE-3).
- `canRead = can('evnt.detection-lapse.read')` hides the whole surface; `canAcknowledge = can('evnt.detection-lapse.confirm')` hides the acknowledge action; disabled WHILE a confirm is in flight (BE idempotent).
- WHILE `suppressedByEmergency` the alert is held back; the emergency takeover owns the screen (LAPSE-6).
- Empty "all stations detecting" state ONLY on a successful read that returned no open lapse; a degraded poll shows the shared `MonitoringStatusBanner` instead (never a false "no lapses").

## Approach (execution path)

1) `DetectionLapseAlertComponent` (smart, OnPush): reads `lapseAlertFacade.detectionLapseAlertVm()` + `alarmFacade.monitoringVm()`; `canRead`/`canAcknowledge` from `AccessDecisionService`.
2) `DetectionLapseCardComponent` (presentational): input `vm: DetectionLapseVM`, `canAcknowledge`; output `acknowledgeRequested`; renders "{patient}'s station stopped detecting · since 14:32" — never emergency styling.
3) `DetectionLapseEmptyStateComponent`: input `visible`; calm "all stations detecting".
4) Wire into the embedded surface (Home notice region / escalation-status slot); declare `DetectionLapseAlert` in `shellSurfaces` (SPEC-06 §1).
5) a11y: `role="status"`/`aria-live="polite"`; colour never the only signal; time via a time-format pipe.

## Non-goals

- No HTTP/poll logic (FE-EVNT-028).
- No route — embedded surface only (SPEC-01).
- No escalation-attempts trail for lapses (contract exposes none — SPEC-03 §4c).

## Layer(s)

frontend / feature (`libs/evnt/feature-lapse/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §2b
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4c

## Architecture alignment

- Standalone + OnPush + Signals; distinct alert, never the emergency takeover
- RBAC-of-UI via AccessDecisionService (no inline role)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-lapse/src/lib/detection-lapse-alert/detection-lapse-alert.component.ts`
- [ ] `libs/evnt/feature-lapse/src/lib/detection-lapse-alert/detection-lapse-alert.component.html`
- [ ] `libs/evnt/feature-lapse/src/lib/detection-lapse-card/detection-lapse-card.component.ts`
- [ ] `libs/evnt/feature-lapse/src/lib/detection-lapse-empty-state/detection-lapse-empty-state.component.ts`
- [ ] `libs/evnt/feature-lapse/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (never rendered as takeover; acknowledge hidden when !canAcknowledge; surface hidden when !canRead; empty only on positive read; held back WHILE suppressedByEmergency)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3
safety:detection-lapse

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- The lapse alert is NEVER rendered as the full-screen `/alarm` takeover
- Acknowledge action hidden when `canAcknowledge=false`; whole surface hidden when `canRead=false`
- Empty "all stations detecting" shown ONLY after a successful no-lapse read

## Dependencies

- FE-EVNT-028 (LapseAlertFacade)
- FE-EVNT-014 (MonitoringStatusBanner reused for degraded states)

## Tenant-context impact

Nenhum.

## Risks / Notes

- SAFETY: a lapse must read clearly as "not detecting", distinct from an emergency, so caregivers do not confuse the two.

## Prioridade

P3
