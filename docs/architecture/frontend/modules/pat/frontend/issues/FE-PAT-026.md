# FE-PAT-026 -- Playwright e2e stubs — add-command.feature + calibrate-command.feature + retire-command.feature (7 scenarios)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
Playwright stubs for `add-command.feature` (4 scenarios), `calibrate-command.feature` (3 scenarios), and `retire-command.feature` (2 scenarios) — all marked `test.fixme()` with correct state isolation.

## Approach (execution path)
1. Create `apps/pat-e2e/src/add-command.spec.ts` with 4 stubs: add command with full form, save disabled (blank label), save disabled (min≥max), compound command + live-test recommendation.
2. Create `apps/pat-e2e/src/calibrate-command.spec.ts` with 3 stubs: recalibrate and row replaced, retired-command inline banner, validation error on duration field.
3. Create `apps/pat-e2e/src/retire-command.spec.ts` with 2 stubs: retire drops from active list, idempotent retire no-op.
4. All 9 stubs use `test.fixme()` / `throw new Error('TODO[FE-PAT-026]: implement')`.
5. Each spec resets session seed before each test.

## Implementation checklist (by layer/file)
- [ ] implementar `apps/pat-e2e/src/add-command.spec.ts` (4 stubs)
- [ ] implementar `apps/pat-e2e/src/calibrate-command.spec.ts` (3 stubs)
- [ ] implementar `apps/pat-e2e/src/retire-command.spec.ts` (2 stubs)
- [ ] `npx nx lint pat-e2e` PASS

## Acceptance criteria
- [ ] 9 test stubs present and explicitly marked fixme/TODO.
- [ ] `retire.spec.ts` includes an idempotent scenario (retire already-retired → no-op).
- [ ] State is reset per-spec (`fe-e2e:shared-seed:state-leak-across-specs`).
- [ ] `npx nx lint pat-e2e` PASS.

## Dependencies
FE-PAT-013 (CommandListComponent), FE-PAT-014 (editor), FE-PAT-023 (retire confirm modal).

## Tenant-context impact
E2e seeds use a caregiver-session token with appropriate tenant.

## Prioridade
P9
