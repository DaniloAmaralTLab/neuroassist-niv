# CONV-003 -- GET /conv/health — public liveness/readiness endpoint (Actuator, SPEC-07)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Exposes the single public endpoint `GET /conv/health` using Spring Boot Actuator. This endpoint
is `permitAll` in `SecurityConfig` (no token required) and must return `200 {"status":"UP"}` when
the datastore (PostgreSQL) and blob storage are reachable, and `503` when a hard dependency is down.
ACS/PAT/HIST reachability is a **readiness detail only** — HIST/PAT outage must never cause
`/conv/health` to return `503`, because the station read path is served from the local cache
and does not depend on those services at runtime (INV-CONV-5, SPEC-07).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/health/HealthController.java`
- [ ] implementar `backend/services/conv-service/src/main/resources/application.yml`
- [ ] configurar Spring Boot Actuator em `application.yml` (`management.endpoints.web.exposure.include: health`)
- [ ] registrar `GET /conv/health` como `permitAll` em `SecurityConfig`

## Criterios de aceite
- [ ] AC-1 `GET /conv/health` returns `200 {"status":"UP"}` without an `Authorization` header
- [ ] AC-2 When the PostgreSQL container is stopped, `GET /conv/health` returns `503`
- [ ] AC-3 `./gradlew :conv-service:compileJava` exits 0

## Dependencias
- CONV-001 (precede)
- CONV-002 (precede — SecurityConfig `permitAll` path)

## Estimativa
S

## Prioridade
P1
