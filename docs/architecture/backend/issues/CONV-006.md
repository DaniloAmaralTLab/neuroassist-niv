# CONV-006 -- TreeService.publish() — POST /conv/trees: create immutable TreeVersion, supersede previous, contentHash/ETag, hard-502 HIST, idempotency (SPEC-02, SPEC-05)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Implements `TreeService.publish()` and `POST /conv/trees` controller (authority
`conv.tree.publish`, TRN service-client token only). The publish creates a new immutable
`TreeVersion`, validates that every phrase `assetId` exists in the submitted `audioManifest`
(422 `dangling-audio-reference` if not, INV-CONV-3), sets the new version `active`, transitions
the previously active version to `superseded` **in the same transaction**, computes `contentHash`
(SHA-256 of the canonical tree JSON) and derives `ETag = '"' + contentHash + '"'` (INV-CONV-4),
then audits `TreePublished` + `TreeVersionSuperseded` to HIST via `AuditPort.auditHard()` —
if that audit fails the whole transaction rolls back and the caller receives `502 audit-unavailable`
(hard-502, ADR-006). Idempotency: a replay of the same `idempotencyKey` returns `200` with the
existing version without touching any state (SPEC-05).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/TreeService.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/TreeController.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/PublishTreeRequestDto.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/tree/PublishTreeResponseDto.java`
- [ ] criar `PublishTreeRequestDto` e `PublishTreeResponseDto`
- [ ] registrar `@Transactional` apenas no método de serviço (ArchUnit RULE)

## Criterios de aceite
- [ ] AC-1 `POST /conv/trees` with valid TRN service-client token and a valid tree returns `201 Created` + `Location: /conv/tree-versions/{versionId}` + `versionId`, `version`, `etag`, `contentHash`, `status=active`, `supersededVersionId` in the body (api-contract §5.1)
- [ ] AC-2 If a phrase in the submitted tree references an `assetId` absent from `audioManifest`, the service returns `422 dangling-audio-reference` and persists nothing (INV-CONV-3)
- [ ] AC-3 If HIST is unreachable (mocked `AuditPort.auditHard` throws), the service rolls back and returns `502 audit-unavailable` (ADR-006)
- [ ] AC-4 A second publish with the same `idempotencyKey` returns `200` with the existing version and creates no duplicate `tree_version` row (SPEC-05)
- [ ] AC-5 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-005 (precede — ports)
- CONV-016 (precede — SecurityConfig, TRN token accepted on this endpoint)

## Estimativa
S

## Prioridade
P2
