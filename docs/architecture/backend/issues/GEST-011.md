# GEST-011 -- CapabilityService — retire capability and checkSupport resolution with ETag generation

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Implement two operations in `CapabilityService`:
(1) `retire(id, actorId)`: sets `supportStatus = UNSUPPORTED` (terminal, never physical delete
INV-GEST-6), idempotent if already unsupported, calls `HistAuditPort` with `EngineCapabilityRetired`
only on actual state change.
(2) `checkSupport(engineVersion, codes)`: for each code, looks up `(engineVersion, code)` from the
local store; absent row → `unknown` / `detectable: false`. Computes `ETag` keyed on engine version +
resolved result for conditional `304`.

## Spec de referencia
- SPEC-02 (capability registry — retire, INV-GEST-6)
- SPEC-03 (support-check gate, INV-GEST-7)
- SPEC-05 (idempotency)
- contracts/api-contract.md §3.3, §3.5

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/application/CapabilityService.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/application/ETagService.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/application/SupportCheckResult.java`

## Resultado esperado
`retire()` on active capability sets `UNSUPPORTED`, audits; on already-unsupported: `200`, no audit.
`checkSupport()` returns per-code truth from local store only (no PAT call). `ETagService` generates
deterministic hash. `./gradlew :gest-service:test` passes.

## Criterios de aceite
- [ ] AC-1: `retire()` on an unsupported capability is idempotent — no second `HistAuditPort.record()` call.
- [ ] AC-2: `retire()` preserves the row (no delete); `findById` after retire still returns the row with `supportStatus=UNSUPPORTED`.
- [ ] AC-3: `checkSupport()` for an absent `(engineVersion, code)` returns `supportStatus=unknown`, `detectable=false` without calling `GestureVocabularyPort` (SPEC-03: PAT is NOT called on the read path).
- [ ] AC-4: `ETagService` produces the same hash for the same input set and a different hash when any result changes.
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `CapabilityServiceRetireTest` and `SupportCheckServiceTest`.

## Dependencias
- GEST-010 (precede — CapabilityService declare already in place)

## Estimativa
M

## Prioridade
P2
