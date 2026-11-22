# EVNT-012 -- Implement PatCommandFeignClient — GET /pat/commands/{id}, service-client token (pat.command.read), fail-closed on PAT unavailability

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT calls `GET /pat/commands/{commandId}` once at ingest to snapshot `urgency` + `commandLabel`
(ADR-004: snapshot, never re-reads). The call uses an ACS-issued **service-client JWT** for the
`evnt-service` principal carrying `pat.command.read` (not the inbound `edge.device` token — PAT
rejects non-service-client tokens). Fail-closed: PAT `404` → `404 command-not-found`; PAT
`5xx`/timeout → `503 catalog-unavailable`; no retry (station retries). Service discovery via
REG; fallback direct `pat.base-url`. See INT-EVNT-002 for the service-client minting path.

## Spec de referencia
- SPEC-01 §2 (ingest fail-closed)
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/pat/PatCommandPort.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/feign/PatCommandFeignClient.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/feign/dto/PatCommandResponse.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/feign/PatCommandFeignClientTest.java` (WireMock: 200 ok, 404, 503)

## Criterios de aceite
- [ ] AC-1 `GET /pat/commands/{commandId}` with `pat.command.read` service-client token returns `{urgency, label}` mapped to `PatCommandPort` result
- [ ] AC-2 PAT `404` → adapter throws `CommandNotFoundException` (mapped to `404 command-not-found` by use case)
- [ ] AC-3 PAT `5xx` or timeout → adapter throws `CatalogUnavailableException` (mapped to `503 catalog-unavailable`), no Event created
- [ ] AC-4 `evnt-service` service-client token (not the edge.device token) is used for the call (INT-EVNT-002)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.feign.PatCommandFeignClientTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- INT-EVNT-002 (service-client minting path — required before service-client token can be obtained)

## Estimativa
S

## Prioridade
P4
