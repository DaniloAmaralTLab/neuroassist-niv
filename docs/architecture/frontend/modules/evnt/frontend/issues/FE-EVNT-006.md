# FE-EVNT-006 -- Access guards — canReadEventGuard, canConfirmEventGuard, canManageSubscriptionGuard, canReadEscalationGuard

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

Four guards in `libs/evnt/access/` each consume `AccessDecisionService.can(<authority>)` and never hardcode `return true`. Guards redirect to login (session absent) or forbidden (authority denied) as specified.

## Context / Problem statement

- Learning pitfall `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision` (ev=6): guards MUST use `AccessDecisionService.can()`, never hardcode `return true`.
- `canConfirmEventGuard` gates the acknowledge handler, NOT only the route — a caregiver may read the alarm yet lack confirm (SPEC-01 §1).
- `evnt.event.ingest` is a device-token authority and must NEVER appear in any guard (G-EVNT-5, INV-EVNT-6).
- Bloqueia: FE-EVNT-002 (canReadEventGuard on /alarm route), FE-EVNT-011 (canConfirmEventGuard at handler)

## Approach (execution path)

1. Create `libs/evnt/access/src/lib/can-read-event.guard.ts`: `inject(AccessDecisionService).can('evnt.event.read')` — redirect to forbidden route on false.
2. Create `libs/evnt/access/src/lib/can-confirm-event.guard.ts`: `inject(AccessDecisionService).can('evnt.event.confirm')` — used at handler level in AlarmPageComponent, not only on the route.
3. Create `libs/evnt/access/src/lib/can-manage-subscription.guard.ts`: checks `evnt.subscription.create` (for enable affordance) and `evnt.subscription.delete` (for disable affordance).
4. Create `libs/evnt/access/src/lib/can-read-escalation.guard.ts`: `inject(AccessDecisionService).can('evnt.escalation.read')` — entire escalation surface hidden on false.
5. Export all from `libs/evnt/access/src/index.ts`.
6. `authGuard` is shared (`@neuroassist/shared/auth-session`), not re-implemented here.

## Non-goals

- No inline role checks in components — components call `accessDecision.can()` directly for display logic (SPEC-05 §4).
- No guard for `evnt.event.ingest` (device-only, INV-EVNT-6).

## Layer(s)

frontend / access (`libs/evnt/access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-01-route-map.md` §1
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-05-tool-contract.md` §4

## Architecture alignment

- Guards via `AccessDecisionService.can()` — never hardcoded (carry-forward `guard:stub-permissive`)
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Access layer**
- [ ] `libs/evnt/access/src/lib/can-read-event.guard.ts`
- [ ] `libs/evnt/access/src/lib/can-confirm-event.guard.ts`
- [ ] `libs/evnt/access/src/lib/can-manage-subscription.guard.ts`
- [ ] `libs/evnt/access/src/lib/can-read-escalation.guard.ts`
- [ ] `libs/evnt/access/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (each guard: granted → true; denied → false/redirect; never hardcoded)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P1 / Foundation

## Labels

type:domain
layer:frontend
scope:evnt
priority:P1

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- Each guard calls `AccessDecisionService.can(<authority>)` (spec assertion, no `return true`)
- `evnt.event.ingest` does not appear in any guard

## Dependencies

- FE-EVNT-001 (MODULE_PERMISSION_MAP defines the authority strings)

## Tenant-context impact

Nenhum (AccessDecisionService resolves authorities from the session, tenant-aware server-side).

## Risks / Notes

- Carry-forward: `guard:stub-permissive` — guards that return true bypass the whole RBAC layer silently.

## Prioridade

P1
