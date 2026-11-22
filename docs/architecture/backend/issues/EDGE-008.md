# EDGE-008 -- Application — DeactivateDevice + ReactivateDevice use cases (reversible lifecycle, G3, INV-EDGE-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Create `DeactivateDeviceUseCase` (reversible soft-disable: `paired → deactivated`, credential
non-refreshable, `DeviceDeactivated` audit) and `ReactivateDeviceUseCase` (G3: `deactivated → paired`,
re-issue fresh credential with new `credentialId`, reset `connectivity=offline`, `DeviceReactivated`
audit). Both are idempotent: re-deactivate → `204` no second audit; reactivate-of-paired → `200` no
new credential. Reactivate of a `revoked` device → `409 device-revoked` (INV-EDGE-6).

## Spec de referencia
- SPEC-02 (DeactivateDevice + ReactivateDevice use cases, G3)
- SPEC-05 (idempotency — re-deactivate/re-activate no second audit)
- event-contracts.md §1 (DeviceDeactivated, DeviceReactivated)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/DeactivateDeviceUseCase.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/ReactivateDeviceUseCase.java`
## Criterios de aceite
- [ ] AC-1 `ReactivateDevice` on a `revoked` device throws `409 device-revoked` (INV-EDGE-6)
- [ ] AC-2 `ReactivateDevice` on a `deactivated` device issues a fresh `credentialId` (new, not the old one — G3)
- [ ] AC-3 Re-deactivate of an already-`deactivated` device returns `204` with no second `DeviceDeactivated` audit (SPEC-05)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-007 (PairDevice precedes), EDGE-002 (EdgeDevice state machine)

## Estimativa
S

## Prioridade
P2
