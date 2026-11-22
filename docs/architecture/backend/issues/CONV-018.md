# CONV-018 -- TreeVersionService.retire() — POST /conv/tree-versions/{id}:retire: withdrawn transition + commit + durable-retry HIST audit + idempotency (SPEC-05, ADR-006)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Implements `TreeVersionService.retire()` and `POST /conv/tree-versions/{versionId}:retire`
controller (authority `conv.tree-version.retire`, TRN service-client token only). Sets the
version `status = withdrawn` and `withdrawnAt = now()`. If the withdrawn version was `active`,
the patient has no active version until the next publish (station keeps its cache — ADR-003).
Failure policy: **commit + durable-retry** (erasure must never be blocked by a HIST outage —
ADR-006). Idempotent: if the version is already `withdrawn`, returns `200 OK` with no state
change (SPEC-05). Version not found in the caller's tenant → `404` (no cross-tenant disclosure,
INV-CONV-7). Returns `200 OK` with `{versionId, status:"withdrawn", withdrawnAt}` (api-contract §6.1).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/TreeVersionService.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/treeversion/TreeVersionController.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/treeversion/RetireResponseDto.java`
- [ ] adicionar `RetireResponseDto` com campos `versionId`, `status`, `withdrawnAt`
- [ ] garantir idempotência: se version.status já é `withdrawn`, retornar `200 OK` sem alterar estado

## Criterios de aceite
- [ ] AC-1 `POST /conv/tree-versions/{versionId}:retire` with valid TRN service-client token returns `200 OK` with `{versionId, status:"withdrawn", withdrawnAt}` (api-contract §6.1)
- [ ] AC-2 Retiring an already-withdrawn version returns `200 OK` with no state change (idempotent, SPEC-05)
- [ ] AC-3 `{versionId}` not in the caller's tenant returns `404 not-found` (no disclosure, INV-CONV-7)
- [ ] AC-4 When HIST is unreachable, the `withdrawn` transition is committed and the `TreeVersionWithdrawn` fact is enqueued for durable retry; response is `200 OK` (ADR-006)
- [ ] AC-5 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-015 (precede — AuditPort durable-retry dispatcher)
- CONV-011 (precede — TreeVersionJpaRepository)
- CONV-016 (precede — TRN service-client token accepted)

## Estimativa
S

## Prioridade
P6
