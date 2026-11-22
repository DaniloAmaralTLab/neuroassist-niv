# GEST-009 -- EngineVersionService — deprecate engine version with idempotency and HIST audit EngineVersionDeprecated

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto
Implement `EngineVersionService.deprecate(version, actorId)`: loads the `EngineVersion` by version
string, calls `engineVersion.deprecate()` (which is idempotent — already-deprecated returns `200` with
no audit), saves, and calls `HistAuditPort` with `EngineVersionDeprecated` only when the status actually
changed. Deprecated versions remain readable; new capability declarations against them are blocked
(`409 engine-version-deprecated`) — that guard lives in `CapabilityService`, not here.

## Spec de referencia
- SPEC-02 (capability registry — deprecate)
- SPEC-05 (idempotency — deprecate is idempotent)
- contracts/api-contract.md §2.4

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/application/EngineVersionService.java`

## Resultado esperado
`deprecate()` for an active version: status becomes `DEPRECATED`, `HistAuditPort` called, `200` returned.
Calling on an already-deprecated version: no state change, no audit, `200` returned (idempotent).
`./gradlew :gest-service:test` passes.

## Criterios de aceite
- [ ] AC-1: `deprecate()` on an `ACTIVE` version calls `HistAuditPort.record()` with `eventType=EngineVersionDeprecated` exactly once.
- [ ] AC-2: `deprecate()` on a `DEPRECATED` version does NOT call `HistAuditPort.record()` (no duplicate audit).
- [ ] AC-3: `deprecate()` on an unknown version throws a not-found exception (surfaced as `404`).
- [ ] AC-4: `@Transactional` on the service method.
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `EngineVersionServiceTest.deprecate*` scenarios.

## Dependencias
- GEST-008 (precede — EngineVersionService register already in place)

## Estimativa
S

## Prioridade
P2
