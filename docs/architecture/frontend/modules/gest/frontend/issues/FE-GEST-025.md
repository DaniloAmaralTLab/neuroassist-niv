# FE-GEST-025 -- Error handling pipeline — ProblemDetail→AppError by type slug, error code map, correlationId preservation (SPEC-07)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`GestErrorMapper` maps HTTP error responses to `AppError` by the `ProblemDetail.type` slug (never by HTTP status code alone — carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`); `correlationId` from `ProblemDetail.extensions.correlationId` is preserved on every `AppError`; toast messages carry `AppError.detail` (never fixed strings — carry-forward `fe-facade:toast-fixed-text-discards-be-detail`).

## Approach (execution path)
Error code map (SPEC-07, complete — by type slug):
- `gest:capability-check/engine-not-registered` → `AppErrorCode.ENGINE_NOT_REGISTERED`
- `gest:capability-check/engine-unsupported-firmware` → `AppErrorCode.ENGINE_UNSUPPORTED_FIRMWARE`
- `gest:capability-check/authority-denied` → `AppErrorCode.CAPABILITY_AUTHORITY_DENIED`
- `evnt:gesture-report/invalid-payload` → `AppErrorCode.REPORT_INVALID_PAYLOAD`
- `evnt:gesture-report/duplicate-report` → `AppErrorCode.REPORT_DUPLICATE` (idempotent — not an error for the user, logged only)
- `edge:catalog/station-unpaired` → `AppErrorCode.STATION_UNPAIRED`
- `*` (fallback) → `AppErrorCode.UNKNOWN_API_ERROR` (preserves `detail` from ProblemDetail)

`GestErrorMapper.map(response: HttpErrorResponse): AppError`:
1. Parse `response.error` as `ProblemDetail`; extract `type`, `detail`, `extensions.correlationId`.
2. Look up `type` slug in map; if not found → `UNKNOWN_API_ERROR`.
3. Return `AppError{code, detail: pd.detail ?? response.statusText, correlationId: pd.extensions?.correlationId}`.

Spec: (a) each slug → correct `AppErrorCode`; (b) `correlationId` from extensions is preserved; (c) unknown slug → `UNKNOWN_API_ERROR` (not throws); (d) `detail` from ProblemDetail surfaces in `AppError.detail`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/gest-error.mapper.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/gest-error.mapper.spec.ts`
- [ ] Error lookup by `type` slug — NOT by HTTP status code
- [ ] `correlationId` preserved on every `AppError`
- [ ] `AppError.detail` carries ProblemDetail `detail` field
- [ ] Unknown slug → `UNKNOWN_API_ERROR` (never throws)
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] All SPEC-07 slugs map to correct `AppErrorCode` — spec verifies each
- [ ] `correlationId` and `detail` preserved (not discarded) — carry-forwards applied
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-006 (GestureReportApiService uses this mapper)
- FE-GEST-007 (CapabilityApiService uses this mapper)
- FE-GEST-008 (EdgeCatalogApiService uses this mapper)

## Tenant-context impact
None — error mapping; `correlationId` is a request trace ID, not tenant data.

## Prioridade
P2
