# EDGE-021 -- Security — DeviceTokenIntrospectController + RevocationStore adapter (POST /device-tokens/introspect, INV-EDGE-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Create `DeviceTokenIntrospectController` (`POST /edge/device-tokens/introspect`, service-client only):
validates an `edge.device` JWT (signature + expiry) and checks the `credentialId` against
`edge_credential_revocation`; returns `active:true` for valid, unexpired, non-revoked tokens or
`active:false` if the `credentialId` is on the revocation list (INV-EDGE-6, G1). Reuses the
`EdgeCredentialRevocationPort` from EDGE-014. Caller must present a service-client token; non-service-client → `403`.
This endpoint is the "immediate revocation" fallback for resource servers when the short TTL hasn't
lapsed yet (ADR-002).

## Spec de referencia
- SPEC-06 (G1 — introspection, INV-EDGE-6)
- SPEC-01 (§6 — introspection endpoint)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/DeviceTokenIntrospectController.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/IntrospectRequest.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/IntrospectResponse.java`
## Criterios de aceite
- [ ] AC-1 `POST /edge/device-tokens/introspect` returns `active:false` for a token whose `credentialId` is on the revocation list (INV-EDGE-6)
- [ ] AC-2 `POST /edge/device-tokens/introspect` returns `403` for a non-service-client caller
- [ ] AC-3 `active:true` response includes `sub`, `actorType`, `tenantId`, `patientId`, `authorities` (api-contract §6.1)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-014 (EdgeCredentialRevocationPort), EDGE-020 (EDGE JWKS for signature validation), EDGE-009 (revoke populates list)

## Estimativa
S

## Prioridade
P5
