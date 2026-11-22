# EDGE-018 -- Application — RefreshCatalog use case + CatalogController (GET /edge/catalog, ETag/304, stale, INV-EDGE-5)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Create `RefreshCatalogUseCase` (triggered on pair, heartbeat-coupled schedule, or catalog miss):
calls PAT via `PatCatalogAdapter` with the service-client token + `If-None-Match`; on `200` replaces
`CachedCatalog` and audits `CatalogRefreshed`; on `304` keeps the cache. Create `ReadCatalogUseCase`
and `CatalogController` (`GET /edge/catalog`, authority `edge.catalog.read` from `edge.device` token):
returns `cached_catalog.payload` with EDGE's own `ETag` (derived from `pat_etag` + `fetchedAt`);
honors device `If-None-Match` → `304 Not Modified`. On PAT outage serves the last cache; sets
`stale=true` past the staleness hint (INV-EDGE-5, ADR-004). `503 catalog-unavailable` only when no
cache exists and PAT is unreachable (api-contract §4.1).

## Spec de referencia
- SPEC-03 (catalog distribution, ADR-004, INV-EDGE-5)
- SPEC-01 (GET /edge/catalog endpoint §4)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/RefreshCatalogUseCase.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/ReadCatalogUseCase.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/CatalogController.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/CatalogResponse.java`
## Criterios de aceite
- [ ] AC-1 `GET /edge/catalog` returns `200` with EDGE `ETag` for a paired device with a cached catalog
- [ ] AC-2 `GET /edge/catalog` with matching `If-None-Match` returns `304 Not Modified`
- [ ] AC-3 `stale=true` is set when `fetchedAt` is older than the staleness hint and PAT is unreachable
- [ ] AC-4 `GET /edge/catalog` returns `503 catalog-unavailable` only when no cache exists and PAT is unreachable
- [ ] AC-5 `GET /edge/catalog` on a non-`paired` device returns `403` (INV-EDGE-4)
- [ ] AC-6 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-015 (PatClient), EDGE-014 (CachedCatalogJpaAdapter), EDGE-013 (EdgeDeviceJpaAdapter)

## Estimativa
S

## Prioridade
P4
