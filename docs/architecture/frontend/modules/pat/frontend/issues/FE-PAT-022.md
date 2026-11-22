# FE-PAT-022 -- Error pipeline — ProblemDetail type slug → field error/toast/banner (preserve detail + correlationId)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
`pat-error.mapper.ts` maps every BE ProblemDetail `type` slug to the correct FE surface (field error / toast / banner / page error), preserving `detail` and `correlationId`; never maps by HTTP status alone.

## Approach (execution path)
1. Create `libs/pat/data-access/src/lib/pat-error.mapper.ts` mapping `AppError.code` slug → FE action per SPEC-07 §2: `unauthenticated` → redirect login; `forbidden` → toast; `not-found` → page error (catalog) or toast (mutation); `validation-error` → field errors per detail; `unknown-gesture-type` → gesture field error; `command-retired` → inline banner; `gesture-type-code-taken` → field error on new-type code.
2. Mapping is by `AppError.code` (the `type` slug from ProblemDetail), never by HTTP status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`).
3. FE never shows raw HTTP response body; always uses `@neuroassist/shared/ui-feedback` with `detail` and `correlationId` preserved (SPEC-07 §1 carry-forward `fe-facade:toast-fixed-text-discards-be-detail`).
4. Update `CommandFacade` and `PatientFacade` to use the mapper.
5. Write unit tests for all 7 slug mappings.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/data-access/src/lib/pat-error.mapper.ts`
- [ ] unit tests (all 7 BE slugs → correct FE surface)
- [ ] Atualizar `libs/pat/data-access/src/lib/command/command.facade.ts` para usar o mapper
- [ ] Atualizar `libs/pat/data-access/src/lib/patient/patient.facade.ts` para usar o mapper
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] All 7 BE slugs from SPEC-07 §2 are handled; none falls through to raw status code mapping.
- [ ] `detail` and `correlationId` are preserved in every surfaced error (SPEC-07 §1).
- [ ] `command-retired` on a calibration PATCH triggers an inline banner, never a row mutation (SPEC-07).
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-010 (CommandFacade uses this mapper).
FE-PAT-008 (PatientFacade uses this mapper).

## Tenant-context impact
Nenhum (`forbidden` (403) does not reveal resource existence to avoid cross-tenant information leakage — SPEC-07 §2).

## Prioridade
P7
