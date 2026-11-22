# HIST-016 -- Operator GET /hist/audit — AuditService.query with filters (correlationId, source, action, subjectType, subjectId, actorId, tenantId, from, to, flagged, cursor, size 1..200); authority hist.audit.read; cross-tenant operator path (ADR-004)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

Provides the full producer trail for incident reconstruction and access review by the compliance
operator. `GET /hist/audit` queries across all 36 fact types from all 5 producers. All filter
parameters are optional (combination). Key design points:
- `correlationId` filter returns every record with that id across producers ordered by `occurredAt`
  — the incident reconstruction spine.
- `flagged=true` returns only records flagged under INV-HIST-4.
- `size` up to 200 (larger than caregiver timeline's 100 — operator context).
- Cross-tenant reads: tenant-scoped data is still fetched per-tenant schema, never by relaxing
  isolation (ADR-004); the operator path is controlled, not a bypass.
- Authority: `hist.audit.read` (operator JWT or service-client with that authority).

## Spec de referencia

- SPEC-01 (api surface — operator trail)
- api-contract.md §3 (GET /hist/audit EARS)
- ADR-004 (tenant isolation — operator path)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/controller/OperatorAuditController.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/usecase/QueryAuditTrail.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/dto/AuditQueryRequest.java`

## Criterios de aceite

- [ ] AC-1 `GET /hist/audit` with `hist.audit.read` authority and `correlationId=X` returns all records with that id across sources, ordered by `occurredAt` ASC
- [ ] AC-2 `GET /hist/audit?flagged=true` returns only records with `flagged = true`
- [ ] AC-3 `size` defaults to `50`; max `200`; above 200 → `400`
- [ ] AC-4 Token without `hist.audit.read` → `403`
- [ ] AC-5 Keyset pagination via `cursor` works consistently (no gaps, no duplicates between pages)
- [ ] AC-6 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-009 (JPA adapter — read path)
- HIST-011 (SecurityConfig — hist.audit.read authority enforcement)

## Estimativa

M

## Prioridade
P7
