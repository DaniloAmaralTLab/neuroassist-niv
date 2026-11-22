# HIST-002 -- AuditController + request/response DTOs + POST /hist/audit API layer (authority hist.audit.record)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Exposes `POST /hist/audit` as the single append-only ingest endpoint for all five producers
(ACS, PAT, EDGE, EVNT, GEST). The controller delegates to the `AppendAuditRecord` use case
(HIST-004). `AuditEnvelopeRequest` captures the canonical envelope shape (api-contract §1);
`AuditRecordResponse` returns `{id, status, flagged, replay, receivedAt}`. `GlobalExceptionHandler`
extends `ResponseEntityExceptionHandler` and overrides `handleMethodArgumentNotValid` (not a new
`@ExceptionHandler` for it — Learning: `exception-handler:global-handler:ambiguous-method-argument-not-valid`)
and re-throws `AccessDeniedException` to prevent 403→500 drift. Base path `/hist` enforced at
controller level (D-640).

## Spec de referencia

- SPEC-01 (api surface, authorities)
- api-contract.md §1 (POST /hist/audit, request shape, response body, EARS)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/controller/AuditController.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/dto/AuditEnvelopeRequest.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/dto/AuditRecordResponse.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/exception/GlobalExceptionHandler.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/exception/ProblemDetailFactory.java`

## Criterios de aceite

- [ ] AC-1 `POST /hist/audit` with valid envelope and `hist.audit.record` authority returns `201` or `200`
- [ ] AC-2 Missing `subjectType`, `occurredAt`, or `correlationId` returns `400 application/problem+json` with `type` suffix `audit-validation`
- [ ] AC-3 Missing or invalid bearer token returns `401`; valid token without `hist.audit.record` returns `403`
- [ ] AC-4 `GlobalExceptionHandler` overrides `handleMethodArgumentNotValid` from `ResponseEntityExceptionHandler` (no duplicate `@ExceptionHandler(MethodArgumentNotValidException.class)`)
- [ ] AC-5 `AccessDeniedException` is re-thrown so `ExceptionTranslationFilter` returns `403` (not `500`)
- [ ] AC-6 `./gradlew :hist-service:test` exits 0 (`AuditControllerTest` with `@WebMvcTest` + `@Import(MethodSecurityTestConfig.class)`)

## Dependencias

- HIST-001 (precede)

## Estimativa

M

## Prioridade
P1
