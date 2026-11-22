# HIST-021 -- Hardening — SLO >=99.9% HA readiness hints; GlobalExceptionHandler corrections; ArchUnit RULE-01..08 hexagonal enforcement; backlog alert contract for commit+durable-retry producers (16 facts)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Closes out the hardening requirements:

1. **SLO >= 99.9% HA readiness** (ADR-005): add `# HA-NOTE` comments in `application.yml`
   documenting minimum replicas (2+) and K8s readiness probe path (`/actuator/health/readiness`).
   The hard-502 set gates most writes; a HIST blip causes producer rollbacks — HA is not optional.

2. **GlobalExceptionHandler** (consolidates Learning fixes):
   - Extends `ResponseEntityExceptionHandler`
   - Overrides `handleMethodArgumentNotValid()` (not `@ExceptionHandler(MethodArgumentNotValidException.class)` — avoids ambiguous mapping in Spring Boot 3.x)
   - `@ExceptionHandler(AccessDeniedException.class)` re-throws so `ExceptionTranslationFilter` returns `403` (not `500`)
   - `ProblemDetail` type URIs use `https://neuroassist/errors/<slug>` as defined in api-contract §5

3. **Backlog alert contract** (ADR-005 consequence): comment in `application.yml` documenting
   the 16-fact commit+durable-retry set, the alert trigger criteria (producer durable queue
   age > N minutes or size > M entries), and the HIST reconcile-window surface
   (`GET /hist/audit?correlationId=X`). This is documentation — no code shipped here.

4. **ArchUnit RULE-01..08**: enforce hexagonal layer rules (domain no Spring/JPA, application
   has @Transactional, api imports only application, infrastructure not imported from domain).

## Spec de referencia

- SPEC-06 (security — SLO, HA)
- SPEC-09 (messaging architecture — no broker; durable retry context)
- api-contract.md §5 (error types)
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`

## Escopo

- [ ] implementar `backend/services/hist-service/src/test/java/com/neuroassist/hist/architecture/HexagonalArchitectureTest.java`
- [ ] atualizar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/exception/GlobalExceptionHandler.java`

## Criterios de aceite

- [ ] AC-1 `HexagonalArchitectureTest` enforces RULE-01..08: domain has no Spring/JPA imports; `@Transactional` only in `application.service`; `api` imports no `infrastructure`
- [ ] AC-2 `GlobalExceptionHandler` overrides `handleMethodArgumentNotValid` from parent class (no duplicate `@ExceptionHandler` for `MethodArgumentNotValidException`)
- [ ] AC-3 `AccessDeniedException` is re-thrown; IT confirms `403` (not `500`) when `@PreAuthorize` rejects a request
- [ ] AC-4 `application.yml` contains `# HA-NOTE` with min-replicas = 2 and readiness probe path
- [ ] AC-5 `application.yml` contains `# BACKLOG-ALERT` documenting the 16-fact set, alert trigger, and reconcile endpoint
- [ ] AC-6 `./gradlew :hist-service:test` exits 0 (ArchUnit tests pass)

## Dependencias

- HIST-002 (GlobalExceptionHandler exists in this issue — HIST-021 refines it)
- HIST-011 (SecurityConfig — @EnableMethodSecurity required for ArchUnit + 403 test)

## Estimativa

M

## Prioridade
P9
