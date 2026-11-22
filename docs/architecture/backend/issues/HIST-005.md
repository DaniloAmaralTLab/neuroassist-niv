# HIST-005 -- AuditScopeRouter + AuditService facade — tenant-scoped vs global-schema routing; AuditService.record (ingest) entry point

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

`AuditService` (application service) is the entry point called by `AuditController.record`. It
invokes `AppendAuditRecord` and delegates to `AuditScopeRouter` to decide which port to call:
`AuditTrailPort` (tenant schema `t_<tenantId>`) or `AuditTrailGlobalPort` (global schema
`neuroassist_global`). `TenantContextHolder.require()` is called as the first line for tenant-scoped
operations. The `AuditScopeRouter` reads the routing decision from the command (tenant/global flag
set by `AppendAuditRecord`).

## Spec de referencia

- SPEC-02 (audit append orchestration, scope routing)
- ADR-004 (tenant isolation — Option A)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/service/AuditService.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/port/out/AuditTrailGlobalPort.java`
- [ ] unit tests: `backend/services/hist-service/src/test/java/com/neuroassist/hist/application/service/AuditServiceTest.java`

## Criterios de aceite

- [ ] AC-1 Tenant-scoped command → `AuditTrailPort.append` called (never `AuditTrailGlobalPort`)
- [ ] AC-2 Global-scope (GEST) command → `AuditTrailGlobalPort.append` called (never `AuditTrailPort`)
- [ ] AC-3 `TenantContextHolder.require()` is called as the first line of `AuditService.record` for tenant-scoped operations (SPEC-06, Learning: `security:tenant-filter:wrong-order`)
- [ ] AC-4 `@Transactional` annotation lives only in `application.service` layer (ArchUnit RULE-05)
- [ ] AC-5 `./gradlew :hist-service:test` exits 0

## Dependencias

- HIST-004 (precede)

## Estimativa

S

## Prioridade
P2
