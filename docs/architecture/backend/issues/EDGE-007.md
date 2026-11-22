# EDGE-007 -- Application — PairDevice use case (compare-and-set claim, credential minting, DevicePaired anchor, INV-EDGE-3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Create `PairDeviceUseCase`: the **anchor action**. The station presents `X-Pairing-Code`; the use
case resolves it via the **global** `device_pairing_code` table, consumes it atomically
(compare-and-set: `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now()` — SPEC-05, INV-EDGE-3),
transitions the device `awaiting_claim → paired`, mints the `edge.device` JWT (via `EdgeDeviceTokenSignerPort`,
authorities restricted to `edge.heartbeat.record` + `edge.catalog.read` — INV-EDGE-2), and audits
`DevicePaired` to HIST. Two concurrent claims on the same code: exactly one pairs, the other gets
`401 invalid-pairing-code` (SPEC-05).

## Spec de referencia
- SPEC-02 (PairDevice use case — anchor action DevicePaired)
- SPEC-05 (compare-and-set idempotency, INV-EDGE-3)
- SPEC-06 (token claims, INV-EDGE-2, ADR-002)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/PairDeviceUseCase.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/PairDeviceCommand.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeDeviceTokenSignerPort.java`
## Criterios de aceite
- [ ] AC-1 Two concurrent claims on the same code: exactly one pairs, the loser gets `401 invalid-pairing-code` (SPEC-05, INV-EDGE-3)
- [ ] AC-2 Minted `edge.device` token authorities = `["edge.heartbeat.record","edge.catalog.read"]` only (INV-EDGE-2)
- [ ] AC-3 `DevicePaired` audit recorded to HIST with `actorType=edge-device`, `credentialId`, `stationFingerprint`
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (unit tests including concurrent-claim race)

## Dependencias
- EDGE-006 (EnrollDevice precedes), EDGE-003 (DevicePairingCode port)

## Estimativa
S

## Prioridade
P2
