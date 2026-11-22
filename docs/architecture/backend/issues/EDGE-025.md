# EDGE-025 -- BDD — offline-catalog-distribution.feature + device-revocation-and-security.feature step definitions

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Write step definitions for the remaining two feature files. `offline-catalog-distribution.feature`
(SPEC-03 cache-first read; ETag/304; PAT-outage fallback; service-client identity; INV-EDGE-5,
INV-EDGE-2). `device-revocation-and-security.feature` (SPEC-06 revoke/deactivate/reactivate; two
token fabrics; cross-tenant rejection; patient-session rejection; INV-EDGE-6/2/1). These build on
the shared step base established in EDGE-024.

## Spec de referencia
- SPEC-08 (BDD feature map — offline-catalog, revocation-security)
- SPEC-03 (catalog distribution, INV-EDGE-5), SPEC-06 (security, INV-EDGE-6/2/1)

## Escopo
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/OfflineCatalogSteps.java`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/DeviceRevocationSteps.java`
## Criterios de aceite
- [ ] AC-1 `offline-catalog-distribution.feature` scenarios all pass (cache-first, ETag/304, PAT outage → stale, never hard-fail — INV-EDGE-5)
- [ ] AC-2 `device-revocation-and-security.feature` scenarios all pass (revoke → `401` on next heartbeat; cross-tenant → `404`; patient-session → `403` — INV-EDGE-6/2/1)
- [ ] AC-3 `./gradlew :edge-service:integrationTest` exits 0 for all 4 feature files

## Dependencias
- EDGE-024 (shared step base), EDGE-018 (catalog), EDGE-009, EDGE-021 (revocation)

## Estimativa
S

## Prioridade
P8
