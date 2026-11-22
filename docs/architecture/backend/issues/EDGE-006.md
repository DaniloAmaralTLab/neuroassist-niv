# EDGE-006 -- Application — EnrollDevice use case (DeviceEnrolled audit to HIST, pairing code minting, INV-EDGE-3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Create `EnrollDeviceUseCase`: creates an `EdgeDevice` in `awaiting_claim`, mints a **single-use
pairing code** (hashed at rest — INV-EDGE-3, Risk R2), returns the plaintext code **exactly once**
in the response, and audits `DeviceEnrolled` to HIST. `tenantId` and `enrolledBy` come from the JWT
claims, never from the request body (INV-EDGE-1). A re-enroll replaces the live pairing code for
the same device (UNIQUE(device_id) on `device_pairing_code` — SPEC-04).

## Spec de referencia
- SPEC-02 (EnrollDevice use case, state machine)
- SPEC-04 (data model — device_pairing_code INV-EDGE-3)
- event-contracts.md §1 (DeviceEnrolled audit)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/EnrollDeviceUseCase.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/EnrollDeviceCommand.java`
## Criterios de aceite
- [ ] AC-1 `EnrollDeviceUseCase` creates `EdgeDevice` with `lifecycleState=awaiting_claim` and stores only the hashed code (INV-EDGE-3)
- [ ] AC-2 Plaintext `pairingCode` is returned once and not persisted (INV-EDGE-3)
- [ ] AC-3 `tenantId` and `enrolledBy` are set from JWT claims only (INV-EDGE-1)
- [ ] AC-4 `DeviceEnrolled` audit is sent to HIST within the same request
- [ ] AC-5 `./gradlew :edge-service:test` exits 0 (unit tests)

## Dependencias
- EDGE-002, EDGE-003 (domain), EDGE-005 (controller wire-up)

## Estimativa
S

## Prioridade
P2
