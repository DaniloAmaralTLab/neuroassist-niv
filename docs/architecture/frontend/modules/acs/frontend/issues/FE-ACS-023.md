# FE-ACS-023 -- ACS error mapper — ProblemDetail type slug → AppError; field errors, toasts and banners per SPEC-07

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`acs-error.mapper.ts` maps every BE `ProblemDetail` `type` slug to an `AppError` with the correct code, preserving `detail` and `correlationId` — the FE never maps by HTTP status alone, never shows a raw HTTP body, and never discards the BE detail behind a fixed string (carry-forwards `http-adapter:error-code-by-status-not-problemdetail-type`, `fe-error-handler:raw-http-error-detail`, `fe-facade:toast-fixed-text-discards-be-detail`; SPEC-07 §2).

## Approach (execution path)
1. Create `acs-error.mapper.ts` exporting `mapAcsError(httpError: HttpErrorResponse): AppError`.
2. Read `httpError.error.type` (the RFC 7807 `type` field, a URN slug suffix).
3. Map slugs to codes: `username-taken` → `{ code: 'username-taken', surface: 'field', field: 'username', message: "This username is already taken." }`.
4. `link-exists` → toast; `forbidden` → toast; `not-found` → toast; `validation-error` → field errors from detail; `unauthenticated` → redirect (guard-driven).
5. Unknown slugs: fall back to `{ code: 'unknown', detail: httpError.error.detail ?? httpError.message, correlationId }`.
6. ALL mapped errors preserve `detail` and `correlationId` from the BE ProblemDetail — never discard.
7. Spec uses `HttpErrorResponse` with real `ProblemDetail` shape `{ type, title, status, detail, instance }` — no `{}` + status (carry-forward `fe-test:http-fixture:problemdetail-without-type-after-type-based-error-map`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/acs-error.mapper.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/acs-error.mapper.spec.ts`
- [ ] Mapping by `type` slug (not by HTTP status code)
- [ ] `username-taken` → field error on `username` (not toast)
- [ ] `detail` and `correlationId` preserved in all AppError results
- [ ] Spec uses full ProblemDetail shape `{ type, title, status, detail }` (never bare `{}`)
- [ ] `forbidden` → toast (no resource existence revealed in message)
- [ ] `npx nx test acs-data-access` PASS (all slug cases covered)

## Acceptance criteria
- [ ] `mapAcsError` maps by `type` slug — an error without `type` falls back to `'unknown'` (not 409→conflict)
- [ ] `username-taken` maps to `{ code: 'username-taken', surface: 'field', field: 'username' }`
- [ ] `detail` and `correlationId` are present in every mapped AppError
- [ ] `npx nx lint acs-data-access` PASS

## Dependencies
FE-ACS-006 (CaregiverApiService uses this mapper), FE-ACS-008 (PatientSessionApiService uses this mapper), FE-ACS-010 (TenantAdminApiService uses this mapper), INT-FE-ACS-004 (real slugs validated against acs-service).

## Tenant-context impact
None — error mapping is stateless.

## Prioridade
P7
