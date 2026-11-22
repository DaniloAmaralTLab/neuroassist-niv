# EDGE-019 -- Security — SecurityConfig (ACS JWKS resource server + TenantContextFilter inside SecurityFilterChain, Risk R5)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Create `SecurityConfig` and `TenantContextFilter` (Risk R5, Learning Layer fix). EDGE is an **ACS
resource server** on human endpoints: `SecurityConfig` registers the ACS JWKS URI
(`ACS_JWKS_URI`) for caregiver/coordinator JWT validation. `TenantContextFilter` extracts `tenantId`
from `SecurityContextHolder` (populated by `BearerTokenAuthenticationFilter`) and loads it into
`TenantContextHolder`; it is registered via `FilterRegistrationBean(enabled=false)` and added with
`addFilterAfter(BearerTokenAuthenticationFilter.class)` — not as a `@Component` (Risk R5). No
`X-Tenant-Id` header is ever trusted (INV-EDGE-1). No `edge.device` token is accepted on human
endpoints (INV-EDGE-2). Permit-all for `/edge/.well-known/jwks.json`, `/edge/health`, and
`POST /edge/devices/pair`.

## Spec de referencia
- SPEC-06 (SecurityConfig, TenantContextFilter, INV-EDGE-1/2, Risk R5)
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`, RULE-04)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/security/SecurityConfig.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/security/TenantContextFilter.java`
## Criterios de aceite
- [ ] AC-1 `TenantContextFilter` is NOT annotated `@Component` and is registered via `FilterRegistrationBean(enabled=false)` + `addFilterAfter(BearerTokenAuthenticationFilter.class)` (Risk R5)
- [ ] AC-2 `GET /edge/.well-known/jwks.json`, `GET /edge/health`, and `POST /edge/devices/pair` are permit-all
- [ ] AC-3 All other endpoints reject requests without a valid JWT with `401`
- [ ] AC-4 `X-Tenant-Id` header is never used to populate `TenantContextHolder` (INV-EDGE-1)
- [ ] AC-5 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-004 (RoleAuthorityPolicy), EDGE-016 (AcsJwksAdapter)

## Estimativa
S

## Prioridade
P5
