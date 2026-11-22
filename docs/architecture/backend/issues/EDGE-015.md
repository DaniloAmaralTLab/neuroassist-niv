# EDGE-015 -- Infrastructure — PatClient Feign adapter (GET /pat/patients/{id}/commands + gesture-types, ETag/304, WireMock stubs)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Create `PatClient` Feign client for EDGE's outbound calls to `pat-service` (integration-contracts.md §1):
`GET {pat.baseUrl}/pat/patients/{patientId}/commands?status=active` (+ `If-None-Match`)
and `GET {pat.baseUrl}/pat/gesture-types` (+ `If-None-Match`). Auth: an **ACS-issued service-client
token** carrying `pat.command.read` + `pat.gesture-type.read` (G2, INV-EDGE-2 — never the device
or patient-session token). `PatCatalogAdapter` wraps the client and handles `304 Not Modified`
(keep cache, no audit) vs `200` (replace cache, audit `CatalogRefreshed`). WireMock stubs cover
`200`, `304`, and PAT outage (INV-EDGE-5).

## Spec de referencia
- SPEC-03 (catalog pull, G2, ETag/304, INV-EDGE-5)
- integration-contracts.md §1 (PAT outbound contract)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/pat/PatClient.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/pat/PatCatalogAdapter.java`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/infrastructure/pat/PatClientWireMockTest.java`
## Criterios de aceite
- [ ] AC-1 `PatCatalogAdapter` sends `If-None-Match` with the stored `pat_etag` on every refresh call (ADR-004)
- [ ] AC-2 On PAT `304`, cache is kept and `CatalogRefreshed` is NOT audited
- [ ] AC-3 On PAT `200`, cache is replaced and `CatalogRefreshed` is audited
- [ ] AC-4 PatClient never sends the `edge.device` or patient-session token (INV-EDGE-2 — service-client only)
- [ ] AC-5 `./gradlew :edge-service:test` exits 0 (WireMock-based integration tests)

## Dependencias
- EDGE-016 (AcsClient provides the service-client token), EDGE-014 (CachedCatalogJpaAdapter)

## Estimativa
S

## Prioridade
P4
