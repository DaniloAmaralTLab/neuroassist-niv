# HIST-011 -- SecurityConfig — OAuth2 resource-server + @EnableMethodSecurity + JwtGrantedAuthoritiesConverter (permissions claim, no SCOPE_ prefix) + TenantContextFilter inside SecurityFilterChain after BearerTokenAuthenticationFilter

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

Configures Spring Security for `hist-service`:
- OAuth2 resource server validating JWTs via ACS JWKS endpoint.
- `JwtGrantedAuthoritiesConverter` reads the `permissions` claim (not `scope`/`scp`) with no
  `SCOPE_` prefix, so `@PreAuthorize("hasAuthority('hist.audit.record')")` matches correctly
  (Learning: `security:jwt-authorities-converter-missing:scope-prefix-mismatch`).
- `@EnableMethodSecurity` on the config class (not just `@EnableWebSecurity`) so `@PreAuthorize`
  annotations are evaluated; without it every token passes (Learning: `security:missing-enable-method-security`).
- `TenantContextFilter` registered **inside** `SecurityFilterChain` via
  `http.addFilterAfter(filter, BearerTokenAuthenticationFilter.class)` with a
  `FilterRegistrationBean.setEnabled(false)` to prevent double-registration — this ensures it runs
  **after** Spring Security JWT processing (Learning: `security:tenant-filter:wrong-order-before-spring-security`,
  `security:tenant-context-filter:early-registration-before-jwt-processing`; SPEC-06).

## Spec de referencia

- SPEC-06 (security — AuthN/AuthZ decisions)
- api-contract.md §0 (authentication model — service-client vs caregiver vs operator)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/config/SecurityConfig.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/security/TenantContextFilter.java`

## Criterios de aceite

- [ ] AC-1 `SecurityConfig` is annotated with both `@EnableWebSecurity` and `@EnableMethodSecurity`
- [ ] AC-2 `JwtGrantedAuthoritiesConverter` reads claim `permissions` with authority-prefix set to `""` (empty)
- [ ] AC-3 `TenantContextFilter` has no `@Component` + `@Order` combo; registered via `http.addFilterAfter(filter, BearerTokenAuthenticationFilter.class)` inside the `SecurityFilterChain` bean
- [ ] AC-4 `FilterRegistrationBean` for `TenantContextFilter` has `setEnabled(false)` to prevent servlet-container double-registration
- [ ] AC-5 Integration test: request without token → `401`; valid token missing `hist.audit.record` → `403`; valid token with authority → reaches controller
- [ ] AC-6 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-001 (precede)

## Estimativa

M

## Prioridade
P5
