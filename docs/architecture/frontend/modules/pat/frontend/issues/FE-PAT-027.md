# FE-PAT-027 -- Playwright e2e stubs — register-gesture-type.feature + register-patient.feature + live-webcam-test.feature (6 scenarios)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
Playwright stubs for `register-gesture-type.feature` (3 scenarios), `register-patient.feature` (2 scenarios), and `live-webcam-test.feature` (2 scenarios) — all marked `test.fixme()` using fake media stream for webcam.

## Approach (execution path)
1. Create `apps/pat-e2e/src/register-gesture-type.spec.ts` with 3 stubs: inline register and slot selected, duplicate code rejected (field error not global toast), engine-support caveat visible.
2. Create `apps/pat-e2e/src/register-patient.spec.ts` with 2 stubs: register and wizard advance, submit disabled (blank name).
3. Create `apps/pat-e2e/src/live-webcam-test.spec.ts` with 2 stubs: start test shows preview, webcam unavailable keeps save enabled — both use Playwright fake media stream / `--use-fake-ui-for-media-stream` flag (SPEC-08 §3 carry-forward: never open a real camera).
4. All 7 stubs use `test.fixme()`.

## Implementation checklist (by layer/file)
- [ ] implementar `apps/pat-e2e/src/register-gesture-type.spec.ts` (3 stubs)
- [ ] implementar `apps/pat-e2e/src/register-patient.spec.ts` (2 stubs)
- [ ] implementar `apps/pat-e2e/src/live-webcam-test.spec.ts` (2 stubs, fake media stream)
- [ ] `npx nx lint pat-e2e` PASS

## Acceptance criteria
- [ ] 7 stubs present and marked fixme/TODO.
- [ ] Webcam tests use fake media stream — no real camera opened in CI (SPEC-08 §3).
- [ ] Duplicate gesture-type code scenario expects a field error on the code input, not a global toast.
- [ ] `npx nx lint pat-e2e` PASS.

## Dependencies
FE-PAT-011 (GestureTypeFacade.register()).
FE-PAT-016 (LiveWebcamTestComponent).
FE-PAT-017 (PatientRegistrationPageComponent).

## Tenant-context impact
Nenhum específico (all e2e tests run with a seeded caregiver token).

## Prioridade
P9
