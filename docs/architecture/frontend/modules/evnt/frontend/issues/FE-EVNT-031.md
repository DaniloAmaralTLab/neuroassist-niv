# FE-EVNT-031 -- [SAFETY-GEST-1] E2E — detection-lapse-alert.feature (14 scenarios)

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`apps/evnt-e2e` runs `detection-lapse-alert.feature` (14 scenarios) proving SAFETY-GEST-1 end-to-end: distinct "station not detecting" alert (never the takeover), emergency precedence (LAPSE-6), server-advertised lapse poll reusing the monitoring model, read-failure/offline holds last-known + never "no lapses", acknowledge + idempotent re-ack, auto-clear on server resolve, not-found neutral, RBAC, and service-client raise/resolve exclusion.

## Context / Problem statement

- SPEC-08 §2 `detection-lapse-alert` scenario inventory + the `.feature` file already authored.
- Stub-integrity (Learning ev=45): generated Playwright stubs MUST fail explicitly (`test.fixme()` / `throw new Error('TODO[FE-EVNT-031]: implement')`), never a vacuous `toHaveURL(/.*/)` under `.skip`.
- Lapse list + acknowledge run against the mock `LAPSE_PORT` adapter; the raise/resolve service-client path is NEVER driven from the dashboard.
- Precedence scenario seeds an active emergency + an open lapse in one read; the lapse must not render as the takeover.
- Degraded / "never claim no lapses" driven via Playwright page APIs (emulate offline, dispatch `visibilitychange`), not a fake clock. RBAC seeds `evnt.detection-lapse.read`/`.confirm` via the session mechanism (`fe-e2e:auth`), never a header.

## Approach (execution path)

1) Generate the Playwright spec from `e2e/detection-lapse-alert.feature` (English Gherkin — the stub generator parses English only).
2) Implement step defs against the mock `LAPSE_PORT`; seed emergency+lapse for the precedence scenario.
3) Drive offline/hidden through `context`/`page` APIs; assert the degraded banner + "no lapses" never shown.
4) Seed authorities via the session mechanism for the RBAC + authority-constants-exact (Scenario Outline) scenarios.
5) No `.skip` on any SAFETY scenario; each spec resets its own seed (`fe-e2e:shared-seed`).

## Non-goals

- No implementation of the feature libs (FE-EVNT-027..030).
- No driving of the service-client raise/resolve endpoints.

## Layer(s)

frontend / e2e (`apps/evnt-e2e/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` §1/§2/§3
- `docs/architecture/frontend/modules/evnt/frontend/e2e/detection-lapse-alert.feature`

## Architecture alignment

- English Gherkin; stubs fail explicitly (no vacuous skip)
- Mock LAPSE_PORT; offline/hidden via page APIs, not a fake clock
- Tag Nx: `scope:evnt`, `type:e2e`

## Implementation checklist (by file)

**e2e**
- [ ] `apps/evnt-e2e/src/detection-lapse-alert.spec.ts` (14 scenarios)
- [ ] mock `LAPSE_PORT` seed helpers (open/acknowledged/resolved lapse; emergency+lapse precedence)

**Tests**
- [ ] `npx nx e2e evnt-e2e` PASS for all 14 scenarios (0 skipped on SAFETY)
- [ ] `npx nx lint evnt-e2e` PASS

## Milestone

Wave P9 / e2e + Hardening

## Labels

type:e2e
layer:frontend
scope:evnt
priority:P9
safety:detection-lapse

## Acceptance criteria

- `npx nx e2e evnt-e2e` PASS (14 scenarios, 0 skipped)
- Precedence scenario proves an active emergency outranks the lapse (lapse not rendered as takeover)
- Offline/read-failure scenarios prove the alert never shows "no detection lapses"
- RBAC scenarios seed authorities via the session mechanism, not a header

## Dependencies

- FE-EVNT-029 (feature-lapse components)
- FE-EVNT-030 (shell integration + precedence)
- INT-FE-EVNT-007 (detection-lapse adapter integration)

## Tenant-context impact

Each spec resets its own tenant/session seed.

## Risks / Notes

- SAFETY: this is the e2e proof that a silent detection stop is surfaced and that an emergency always wins.

## Prioridade

P9
