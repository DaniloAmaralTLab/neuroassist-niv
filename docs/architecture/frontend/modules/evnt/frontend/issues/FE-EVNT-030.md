# FE-EVNT-030 -- [SAFETY] EvntShellIntegrationService — lapse poll lifecycle + emergency precedence

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`EvntShellIntegrationService` (`libs/evnt/integration/`) and `evnt.bootstrap.ts` wire the detection-lapse poll into the SAME Page-Visibility / connectivity / monitoring stack as the active-alarm poll (one stack, not two), mount the embedded `DetectionLapseAlert` surface, enforce emergency precedence (LAPSE-6), and forward lapse-acknowledge UI actions to observability.

## Context / Problem statement

- SPEC-06 §2: the Shell owns the visibility/online listeners; the lapse poll must REUSE them and the shared `MonitoringVM`, never register a second stack.
- LAPSE-6: WHILE an unconfirmed emergency is active, the emergency takeover keeps precedence; the lapse alert is held back (`suppressedByEmergency`), never ranked above the emergency.
- `init` starts the lapse poll (WHERE `evnt.detection-lapse-alert` on); `destroy` stops it with no dangling timers and clears lapse signals.
- Lapse-acknowledge UI action forwarded to `@neuroassist/shared/observability` with the correlation id (BE audits `DetectionLapseAcknowledged` server-side).

## Approach (execution path)

1) `EvntShellIntegrationService`: surface `LapseAlertFacade.detectionLapseAlertVm()`; mount the `DetectionLapseAlert` shell surface; subscribe to the existing visibility/online streams (do not add new listeners).
2) Apply precedence: observe `AlarmFacade.activeEmergency`; keep the takeover above the lapse; never promote a lapse to an emergency.
3) `evnt.bootstrap.ts` `init` step 5b: start the lapse poll on the shared monitoring model; `destroy`: stop the lapse poll, clear lapse signals.
4) Forward lapse-acknowledge to observability with the correlation id.

## Non-goals

- No SW / push concerns (that is INT-FE-EVNT-002 / FE-EVNT-019).
- No new visibility/connectivity listener stack.
- No raise/resolve wiring (service-client, out of FE scope).

## Layer(s)

frontend / integration (`libs/evnt/integration/`) + app entry (`evnt.bootstrap.ts`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-06-shell-integration.md` §2/§3
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §6.2/§6.3

## Architecture alignment

- One monitoring stack shared with the alarm poll (SPEC-06 §2)
- Emergency outranks the lapse (LAPSE-6)
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Integration / app entry**
- [ ] `libs/evnt/integration/src/lib/evnt-shell-integration.service.ts` (lapse surface + precedence)
- [ ] `apps/neuroassist-niv/src/app/evnt-module/evnt.bootstrap.ts` (init 5b / destroy lapse poll)

**Tests**
- [ ] `npx nx test evnt` PASS (lapse poll uses the shared visibility/online stack; emergency outranks lapse; destroy leaves no dangling lapse timer; acknowledge forwarded to observability)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P4 / Hub integrations

## Labels

type:integration
layer:frontend
scope:evnt
priority:P4
safety:detection-lapse

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- Only ONE visibility/connectivity listener stack exists (shared with the alarm poll)
- WHILE an unconfirmed emergency is active, the lapse alert is held back and the takeover keeps precedence
- `destroy` stops the lapse poll with no dangling timers

## Dependencies

- FE-EVNT-028 (LapseAlertFacade)
- FE-EVNT-020 (EvntShellIntegrationService — Page Visibility + connectivity)
- FE-EVNT-029 (DetectionLapseAlert surface)

## Tenant-context impact

Tenant switch clears lapse signals (same as alarm).

## Risks / Notes

- SAFETY: a lapse must never steal the screen from a real emergency (LAPSE-6).

## Prioridade

P4
