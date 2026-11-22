# FE-PAT-019 -- canManageCatalogGuard — AccessDecisionService.can() (never hardcode return true, carry-forward guard:stub-permissive)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`canManageCatalogGuard` gates `/patients/register` and `/patients/:patientId/commands` via `AccessDecisionService.can(...)`, never hardcodes `return true` (carry-forward `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision`, ev=6).

## Approach (execution path)
1. Create `libs/pat/access/src/lib/can-manage-catalog.guard.ts` as a functional guard.
2. Inject `AccessDecisionService` from `@neuroassist/shared/access-decision`.
3. Allow the route when the session holds any of: `pat.command.read`, `pat.command.create`, or `pat.patient.create` (SPEC-01 §1).
4. On denial redirect to the shell forbidden route — NEVER hardcode `return true` even as a stub (carry-forward ev=6).
5. Export from `libs/pat/access/src/index.ts`.
6. Unit tests: session with `pat.command.read` → allowed; session without any PAT authority → denied; patient-session (`conv.*` only) → denied.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/access/src/lib/can-manage-catalog.guard.ts`
- [ ] exportar de `libs/pat/access/src/index.ts`
- [ ] unit tests (pat.command.read allows, no-pat-authority denies, patient-session denies)
- [ ] `npx nx test pat-access` PASS
- [ ] `npx nx lint pat-access` PASS

## Acceptance criteria
- [ ] Guard uses `AccessDecisionService.can(...)` and NEVER contains a hardcoded `return true` (SPEC-01 §1, carry-forward ev=6).
- [ ] A patient-session token (conv.*/gest.* only) is denied and redirected to the forbidden route (INV-PAT-7).
- [ ] `npx nx build pat-access` PASS.

## Dependencies
FE-PAT-018 (authGuard runs first on the same routes).

## Tenant-context impact
`AccessDecisionService` reads session authorities from the JWT (which include the tenant claim); no guard-level tenant branching needed.

## Prioridade
P5
