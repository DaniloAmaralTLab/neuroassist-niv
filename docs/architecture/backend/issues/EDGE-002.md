# EDGE-002 -- Domain — EdgeDevice aggregate (lifecycle state machine, invariants INV-EDGE-1/4/6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Create the `EdgeDevice` aggregate root with the `lifecycleState` state machine
(`awaiting_claim | paired | deactivated | revoked`) and the `connectivity` dimension
(`online | offline`, null while not `paired`). Implements invariants INV-EDGE-1 (tenant from JWT,
never from header), INV-EDGE-4 (heartbeat/catalog require `paired`), INV-EDGE-6 (`revoked` is
terminal). `EdgeDeviceRepositoryPort` is the domain port the application layer uses. The `LifecycleState`
and `Connectivity` enums mirror the CHECK constraints in `data-model.md`.

## Spec de referencia
- SPEC-02 (device lifecycle and liveness)
- SPEC-04 (data model — edge_device table, INV-EDGE-1/4/6)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeDevice.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/LifecycleState.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/Connectivity.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeDeviceRepositoryPort.java`
## Criterios de aceite
- [ ] AC-1 `LifecycleState` enum contains exactly `awaiting_claim`, `paired`, `deactivated`, `revoked`; `Connectivity` contains `online`, `offline`
- [ ] AC-2 `EdgeDevice` rejects a transition from `revoked` to any state (throws domain exception, INV-EDGE-6)
- [ ] AC-3 `EdgeDevice.connectivity` is null when `lifecycleState != paired` (domain invariant)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (unit tests for state machine transitions)

## Dependencias
- EDGE-001 (precede)

## Estimativa
S

## Prioridade
P1
