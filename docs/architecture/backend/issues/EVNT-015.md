# EVNT-015 -- Configure Spring Security dual-resource-server (EDGE + ACS JWKS), authority map, TenantContextHolder for schema-per-tenant routing

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT plays two security roles simultaneously (api-contract §0.2): (1) **EDGE resource server** on
`POST /evnt/gesture-reports` — validates `edge.device` tokens via EDGE JWKS; (2) **ACS resource
server** on all caregiver paths — validates ACS-issued caregiver JWTs. The security config must
route by token issuer and reject cross-issuer tokens with `401` (INV-EVNT-6). `RoleAuthorityPolicy`
declares the nine constants `evnt.<resource>.<action>`. `TenantContextHolder` extracts `tenantId`
from the JWT claim and sets the Hibernate schema context for schema-per-tenant routing (ADR-003).
Domain verbs `ingest`, `confirm`, `record` are non-standard `_OP_VERB_TO_ACTION` entries (D-531
learning pitfall — register them before scaffold).

## Spec de referencia
- SPEC-06 (security invariants INV-EVNT-1/6/7)
- docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md
- docs/architecture/backend/adr/ADR-003-multi-tenancy.md

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/security/EvntSecurityConfig.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/security/TenantContextHolder.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/security/RoleAuthorityPolicy.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/security/EvntSecurityConfigTest.java`

## Criterios de aceite
- [ ] AC-1 `POST /evnt/gesture-reports` with ACS caregiver token (wrong issuer) → `401 Unauthorized` (INV-EVNT-6)
- [ ] AC-2 `GET /evnt/patients/{id}/active-alarm` with `edge.device` token (wrong issuer) → `401 Unauthorized` (INV-EVNT-6)
- [ ] AC-3 Tenant context derived from JWT `tenantId` claim; `X-Tenant-Id` header is ignored (INV-EVNT-1)
- [ ] AC-4 `RoleAuthorityPolicy` declares constants for all nine authorities (`evnt.event.ingest/read/confirm/record`, `evnt.subscription.create/delete`, `evnt.escalation.read`)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.security.EvntSecurityConfigTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-011 (precede — EdgeTokenValidatorAdapter wired into security chain)
- EVNT-013 (precede — AcsJwksClient wired into security chain)

## Estimativa
M

## Prioridade
P5
