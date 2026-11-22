# CONV-017 -- TenantContextFilter + TenantContextHolder — schema-per-tenant, registered after BearerTokenAuthenticationFilter (SPEC-06, RULE-04)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Implements `TenantContextFilter` and `TenantContextHolder` for the schema-per-tenant model.
`TenantContextFilter` is a `OncePerRequestFilter` registered **inside** the Spring Security
`SecurityFilterChain`, **after** `BearerTokenAuthenticationFilter`, so the JWT is authenticated
before the tenant is extracted from the `tenantId` claim (SPEC-06, Learning pitfall
`security:tenant-filter:order-before-spring-security`). `TenantContextHolder` uses a thread-local
to hold the current `tenantId`; application services call `TenantContextHolder.require()` as
their first line (RULE-04, INV-CONV-7). The `api` layer must not import `infrastructure.security`
(ArchUnit RULE-04). `X-Tenant-Id` headers on inbound requests are explicitly ignored (INV-CONV-7).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/security/TenantContextFilter.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/security/TenantContextHolder.java`
- [ ] adicionar `TenantContextHolder.clear()` no `finally` block do `TenantContextFilter` para evitar leakage entre requests (thread pool reuse)

## Criterios de aceite
- [ ] AC-1 `TenantContextFilter` is registered after `BearerTokenAuthenticationFilter` in the filter chain; calling `TenantContextHolder.require()` before filter execution throws `TenantNotResolvedException`
- [ ] AC-2 An IT confirms that `X-Tenant-Id` header on the request is ignored; tenant always derives from the JWT `tenantId` claim (INV-CONV-7)
- [ ] AC-3 `TenantContextHolder.clear()` is called in `finally` to ensure no tenant leaks across requests in the thread pool
- [ ] AC-4 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-016 (precede — SecurityConfig, BearerTokenAuthenticationFilter registered)

## Estimativa
S

## Prioridade
P5
