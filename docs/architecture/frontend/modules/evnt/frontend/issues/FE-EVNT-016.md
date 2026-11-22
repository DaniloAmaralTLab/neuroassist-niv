# FE-EVNT-016 -- EscalationAttemptsComponent + EscalationAttemptRowComponent

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/feature-push/` contains `EscalationAttemptsComponent` (smart, on-demand read) and `EscalationAttemptRowComponent` (presentational). The entire surface is hidden WHILE `!canRead` (`evnt.escalation.read`). Masked targets are rendered verbatim. A trail failure shows an inline retry that does NOT affect the alarm takeover.

## Context / Problem statement

- The escalation trail is a read-only diagnostic aid — not a control path and not part of the alarm delivery itself (SPEC-02 §2a, SPEC-03 §4b).
- `maskedTarget` is already masked BE-side — the FE renders it verbatim and NEVER unmasks, re-derives, or joins a full phone/endpoint.
- `errorReason` → humanised `note`, never a raw provider stack trace.
- If the trail read fails: inline retry on the trail surface only — NEVER affects the alarm takeover or the monitoring banner (SPEC-07 §2.3).
- The whole surface is hidden WHILE session lacks `evnt.escalation.read` (SPEC-05 §2).

## Approach (execution path)

1. `EscalationAttemptsComponent`: smart, OnPush. Reads `alarmFacade.escalationTrailVm(eventId)`. Hidden via RBAC if `!canRead`. On-demand load (not polled). Shows `EscalationAttemptRow` for each attempt. Inline retry on `errored=true` — does not touch `alarmVm` or `monitoringVm`.
2. `EscalationAttemptRowComponent`: presentational. Inputs `vm: EscalationAttemptVM`. Renders tier/channel badge, `maskedTarget` verbatim, status, humanised note, time (time-format pipe).
3. `canRead = accessDecision.can('evnt.escalation.read')` — entire surface hidden via `@if(canRead)`.

## Non-goals

- No alarm delivery logic.
- No unmasking of target.
- No real-time polling (read on-demand only).

## Layer(s)

frontend / feature (`libs/evnt/feature-push/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §2a
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4b

## Architecture alignment

- Standalone + OnPush + Signals
- Masked target verbatim (never enriched)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-push/src/lib/escalation-attempts/escalation-attempts.component.ts`
- [ ] `libs/evnt/feature-push/src/lib/escalation-attempts/escalation-attempts.component.html`
- [ ] `libs/evnt/feature-push/src/lib/escalation-attempt-row/escalation-attempt-row.component.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (hidden when !canRead; maskedTarget rendered as-is; trail failure shows inline retry, not alarm banner)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- Component hidden when `canRead=false`
- `maskedTarget` in row equals input `vm.maskedTarget` unchanged
- Trail HTTP failure does not change `alarmVm` or `monitoringVm`

## Dependencies

- FE-EVNT-009 (AlarmFacade.escalationTrailVm)
- FE-EVNT-008 (EscalationAttemptVM from mapper)

## Tenant-context impact

Nenhum.

## Risks / Notes

- Read-only and masked — a future escalation trace feature must NOT use this component to show raw phone/endpoints.

## Prioridade

P3
