# EDGE-005 -- API — DeviceManagementController + all device DTOs (8 endpoints: enroll/list/get/activate/pair/deactivate/unpair/revoke)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

Create `DeviceManagementController` with all 8 device-management endpoints (api-contract §2):
`POST /edge/devices` (enroll), `GET /edge/devices` (list), `GET /edge/devices/{id}` (get),
`POST /edge/devices/{id}/activation` (activate), `POST /edge/devices/pair` (pair),
`DELETE /edge/devices/{id}` (deactivate), `DELETE /edge/devices/{id}/pairing` (unpair),
`DELETE /edge/devices/{id}/credential` (revoke). All `@PreAuthorize` expressions reference
`RoleAuthorityPolicy` constants (INV-EDGE-7). The `pair` endpoint uses `X-Pairing-Code` header
(code-authenticated, no JWT, ADR-003). Error body is `ProblemResponse` (RFC 7807, api-contract §8).

## Spec de referencia
- SPEC-01 (api surface — all 8 device endpoints, error model)
- SPEC-06 (security — authority guards, INV-EDGE-7)
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/DeviceManagementController.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/EnrollDeviceRequest.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/DeviceResponse.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/DeviceListResponse.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/PairDeviceRequest.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/PairDeviceResponse.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/ProblemResponse.java`
## Criterios de aceite
- [ ] AC-1 `POST /edge/devices` returns `201 Created` with `Location` header and `pairingCode` in body (api-contract §2.1)
- [ ] AC-2 `POST /edge/devices/pair` reads `X-Pairing-Code` header, not `Authorization` JWT (ADR-003)
- [ ] AC-3 All `@PreAuthorize` expressions reference `RoleAuthorityPolicy` constants — no literal strings (INV-EDGE-7)
- [ ] AC-4 `ProblemResponse` body contains `type`, `status`, `detail`, `correlationId` on every error (api-contract §8)
- [ ] AC-5 `./gradlew :edge-service:compileJava` exits 0

## Dependencias
- EDGE-001, EDGE-002, EDGE-003, EDGE-004 (precedem)

## Estimativa
S

## Prioridade
P1
