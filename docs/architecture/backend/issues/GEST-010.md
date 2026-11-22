# GEST-010 -- CapabilityService — declare capability (upsert + PAT vocabulary validation + HIST audit EngineCapabilityDeclared)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement `CapabilityService.declare(engineVersion, gestureTypeCode, supportStatus, notes, actorId)`:
(1) rejects if engine version is deprecated (`409 engine-version-deprecated`); (2) validates
`gestureTypeCode` via `GestureVocabularyPort.exists(code)` — absent → `400`, PAT down → `503
pat-vocabulary-unavailable` (fail-closed, INV-GEST-1); (3) upserts the `(engineVersionId,
gestureTypeCode)` row (INV-GEST-2: insert → `201`, update → `200`); (4) calls `HistAuditPort` with
`EngineCapabilityDeclared` including `previousSupportStatus` when updating. This is the anchor event.

## Spec de referencia
- SPEC-02 (capability registry — declare)
- SPEC-03 (vocabulary validation, fail-closed)
- SPEC-05 (idempotency/concurrency)
- contracts/api-contract.md §3.4
- contracts/event-contracts.md §1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/application/CapabilityService.java`

## Resultado esperado
`declare()` performs the 4-step sequence correctly. PAT-down scenario fails closed. Duplicate pair
upserts cleanly. `./gradlew :gest-service:test` passes for `CapabilityServiceDeclareTest`.

## Criterios de aceite
- [ ] AC-1: `declare()` against a deprecated engine version throws a domain exception surfaced as `409 engine-version-deprecated`.
- [ ] AC-2: `declare()` calls `GestureVocabularyPort.exists(code)`; unknown code throws `400 gesture-type-code-unknown`; port throws `ServiceUnavailableException` → `503 pat-vocabulary-unavailable`.
- [ ] AC-3: New pair inserts and returns status `CREATED`; existing pair updates `supportStatus` + `updatedAt` and returns `OK`.
- [ ] AC-4: `HistAuditPort.record()` is called with `eventType=EngineCapabilityDeclared`; payload includes `previousSupportStatus` when updating an existing row.
- [ ] AC-5: `@Transactional` on `declare()`.
- [ ] AC-6: `./gradlew :gest-service:test` exits 0 for `CapabilityServiceDeclareTest`.

## Dependencias
- GEST-007 (precede — EngineCapability aggregate + SupportStatus)
- GEST-009 (precede — EngineVersionService deprecate, so engine lifecycle is complete)
- GEST-015 (precede — GestureVocabularyPort interface)
- GEST-017 (precede — HistAuditPort interface)

## Estimativa
L

## Prioridade
P2
