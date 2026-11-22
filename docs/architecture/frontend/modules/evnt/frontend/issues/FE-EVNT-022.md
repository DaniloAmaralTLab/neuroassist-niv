# FE-EVNT-022 -- Error handling pipeline — ProblemDetail type slug → surface mapping

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/data-access/src/lib/evnt-error-handler.ts` maps `ProblemDetail.type` slugs to surface-specific actions: read failures → `MonitoringStatusBanner`; confirm failure → keeps alarm active + optimistic rollback that re-raises; non-critical errors → toast with `correlationId`. Detail and correlationId are always preserved.

## Context / Problem statement

- Read failure (poll) MUST NOT show a toast — it updates `MonitoringVM.polling='stale'` and the banner handles it. A toast on every poll failure would fire every few seconds (SPEC-07 §2.1).
- Confirm failure MUST keep the alarm active. If an optimistic-clear was used, the rollback re-raises the alarm signal — the caregiver must re-confirm (SPEC-07 §2.2). Do NOT silently swallow a 409/422 as success.
- Non-critical errors (e.g. mark-not-real failure, trail read failure) → toast with the full `ProblemDetail.detail` and `correlationId` for support.
- The mapper does NOT strip `correlationId` or `detail` (carry-forward `fe-error:correlation-id-stripped`).

## Approach (execution path)

1. Create `evnt-error-handler.ts`: a pure function `mapProblemDetail(err, context) → EvntErrorAction`.
2. `EvntErrorAction` union: `{ type: 'poll-degraded', pollingState }` | `{ type: 'confirm-failure', revert: boolean }` | `{ type: 'toast', slug, detail, correlationId }`.
3. Poll path: HTTP error → `{ type: 'poll-degraded', pollingState: 'stale' }` → `AlarmFacade.setDegraded(state)`.
4. Confirm path: HTTP error → `{ type: 'confirm-failure', revert: true }` → `AlarmFacade.revertOptimisticClear()`.
5. Non-critical paths → `{ type: 'toast', ... }`.
6. 410 Gone on push DELETE → no action (treated as success — FE-EVNT-019).

## Non-goals

- No global error interceptor — `evnt-error-handler` is a targeted mapper, not an `HttpInterceptor`.
- No Sentry / crash reporting (that is a Shell concern).

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-07-error-handling.md` §2–§3

## Architecture alignment

- Pure mapper, no side effects
- `correlationId` always preserved
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access layer**
- [ ] `libs/evnt/data-access/src/lib/evnt-error-handler.ts`
- [ ] `libs/evnt/data-access/src/lib/evnt-error.types.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (poll error → poll-degraded; confirm 409 → confirm-failure + revert; non-critical → toast with correlationId; 410 → no action)
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
- Poll error does not trigger a toast (maps to poll-degraded only)
- Confirm failure revert=true re-raises alarm signal
- Non-critical error includes `correlationId` in toast payload

## Dependencies

- FE-EVNT-009 (AlarmFacade.setDegraded / revertOptimisticClear)
- FE-EVNT-007 (EventApiService error propagation)

## Tenant-context impact

Nenhum.

## Risks / Notes

- Carry-forward `fe-error:correlation-id-stripped`: always pass `correlationId` through — never drop it in an error handler.

## Prioridade

P2
