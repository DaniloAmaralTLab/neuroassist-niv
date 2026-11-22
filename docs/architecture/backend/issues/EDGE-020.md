# EDGE-020 -- Security — EdgeDeviceTokenSignerPort + issuer adapter (mint edge.device JWT, sign, publish JWKS, G1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Create `EdgeDeviceTokenIssuerAdapter` implementing `EdgeDeviceTokenSignerPort` (domain port from
EDGE-007): mints `edge.device` JWTs signed by EDGE's own RSA/EC signing key
(`EDGE_DEVICE_TOKEN_SIGNING_KEY_ALIAS`). Token claims: `sub=deviceId`, `actorType=edge-device`,
`deviceId`, `patientId`, `tenantId`, `authorities=["edge.heartbeat.record","edge.catalog.read"]`
(+ EVNT report right pending INT-EDGE-001), `jti/kid=credentialId`, `exp=now+900s` (G1, INV-EDGE-2).
`JwksController` (`GET /edge/.well-known/jwks.json`, public) publishes the active EDGE signing
public key(s) so GWY/PAT/EVNT can verify EDGE-issued tokens (ADR-002).

## Spec de referencia
- SPEC-06 (G1, ADR-002, edge.device token claims, INV-EDGE-2)
- SPEC-01 (§5 — JWKS endpoint)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/security/EdgeDeviceTokenIssuerAdapter.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/JwksController.java`
## Criterios de aceite
- [ ] AC-1 Minted `edge.device` token contains exactly `["edge.heartbeat.record","edge.catalog.read"]` authorities (INV-EDGE-2; EVNT right added after INT-EDGE-001 resolves)
- [ ] AC-2 `GET /edge/.well-known/jwks.json` returns a JWKS document with the active EDGE signing public key (ADR-002)
- [ ] AC-3 `jti/kid` claim equals the `credentialId` stored on `EdgeDevice`
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (token validation test with EDGE JWKS)

## Dependencias
- EDGE-007 (PairDevice mints via this port), EDGE-008 (ReactivateDevice re-mints), INT-EDGE-001 (EVNT right TBD)

## Estimativa
S

## Prioridade
P5
