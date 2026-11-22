# EVNT-011 -- Implement EdgeTokenValidatorAdapter — EDGE JWKS cache + introspection for edge.device token verification (INV-EVNT-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT is an **EDGE resource server** on the ingest path: every `POST /evnt/gesture-reports` must
validate the inbound `edge.device` token against EDGE JWKS (`GET /edge/.well-known/jwks.json`) and
consult EDGE introspection (`POST /edge/device-tokens/introspect`) on this revoke-sensitive path.
JWT signature verification uses the cached key set; introspection checks for a revoked/unpaired
device within one TTL. On EDGE outage: a signature-valid, unexpired token still passes (best-effort
introspection logged — integration-contracts §1). Adapter exposes `EdgeTokenValidator` port
(domain). `deviceId`, `patientId`, `tenantId` are extracted from token claims only — never from
the body (INV-EVNT-6).

## Spec de referencia
- SPEC-06 (security — dual resource server)
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/security/EdgeTokenValidator.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/security/EdgeTokenValidatorAdapter.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/security/EdgeJwksClient.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/security/EdgeTokenValidatorAdapterTest.java` (valid token, revoked device, EDGE outage)

## Criterios de aceite
- [ ] AC-1 Valid `edge.device` token with `evnt.event.ingest` authority passes validation and returns `{deviceId, patientId, tenantId}` from claims
- [ ] AC-2 Revoked/unpaired device (introspection `active = false`) returns `401 Unauthorized` (INV-EVNT-6)
- [ ] AC-3 Signature-invalid or expired token returns `401 Unauthorized` regardless of introspection result
- [ ] AC-4 EDGE introspection outage with valid, unexpired token → passes (best-effort, logged), no `401` from outage alone
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.security.EdgeTokenValidatorAdapterTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-015 (precede — security config integrates this adapter)

## Estimativa
M

## Prioridade
P4
