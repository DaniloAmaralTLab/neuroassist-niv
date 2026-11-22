# INT-FE-ACS-004 -- Error contract smoke — ProblemDetail type slug → AppError for all ACS slugs (real acs-service responses)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
Every `ProblemDetail` slug that `acs-service` can emit is exercised against a live service and confirmed to map to the expected `AppError` code via `mapAcsError`; no slug is handled by fallback status-code mapping (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`; SPEC-07 §2).

## Approach (execution path)
1. Bring up `acs-service` + gateway.
2. For each slug in SPEC-07 §2 (`username-taken`, `link-exists`, `forbidden`, `not-found`, `validation-error`, `unauthenticated`): trigger the corresponding error condition against the live service and capture the `ProblemDetail` body.
3. Verify that the response `Content-Type` is `application/problem+json` and that `type` contains the slug as a suffix.
4. Pass the captured `HttpErrorResponse` through `mapAcsError` and assert the resulting `AppError.code` equals the slug.
5. Verify `detail` and `correlationId` are preserved in the `AppError`.
6. For `unauthenticated`: verify the guard-driven redirect to `/login` triggers (not an inline `AppError`).
7. Update `acs-error.mapper.ts` if any slug is new or missing.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/acs-error.mapper.ts`
- [ ] `username-taken` slug triggers field error on `username` (not toast)
- [ ] `forbidden` slug preserves detail + correlationId
- [ ] `not-found` slug maps to toast (no resource existence revealed)
- [ ] `validation-error` slug maps to per-field errors from detail
- [ ] `unauthenticated` slug triggers redirect to `/login`
- [ ] `npx nx test acs-data-access` PASS (all slug cases)

## Acceptance criteria
- [ ] All 6 ACS ProblemDetail slugs map to the expected AppError code
- [ ] `AppError.detail` and `AppError.correlationId` are populated from the BE response
- [ ] No slug falls through to status-code fallback mapping

## Dependencies
FE-ACS-023 (acs-error.mapper.ts implementation).

## Tenant-context impact
None — error mapping is stateless.

## Prioridade
P4
