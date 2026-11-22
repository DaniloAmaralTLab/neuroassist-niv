# CONV-001 -- Hexagonal scaffold — Gradle module + four-layer package skeleton + application.yml

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Foundation issue for `conv-service`. Creates the four-layer package skeleton
(`api / application / domain / infrastructure`) under `com.neuroassist.conv` and the Gradle
build file with the `integrationTest`/`test` split required by D-636: without
`tasks.test { exclude("**/*IT.class") }` the plain `test` task picks up `CucumberIT`
and `MethodSecurityEnforcementIT`, which require the full Spring context and cause
`DefaultCacheAwareContextLoaderDelegate` failures at P1. `application.yml` wires port 8085
(generator-config.yml), Eureka and datasource stubs.
Hexagonal ADR: `docs/architecture/backend/adr/` glob `ADR-*-hexagonal-architecture.md`.

## Escopo
- [ ] implementar `backend/services/conv-service/build.gradle.kts`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/.gitkeep`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/application/.gitkeep`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/.gitkeep`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/.gitkeep`
- [ ] implementar `backend/services/conv-service/src/main/resources/application.yml`
- [ ] registrar `conv-service` em `backend/settings.gradle.kts` (include statement)

## Criterios de aceite
- [ ] AC-1 `./gradlew :conv-service:compileJava` exits 0
- [ ] AC-2 `build.gradle.kts` contains `tasks.test { exclude("**/*IT.class") }` and a separate `integrationTest` task (D-636)
- [ ] AC-3 Four package directories exist under `src/main/java/com/neuroassist/conv/`: `api/`, `application/`, `domain/`, `infrastructure/`
- [ ] AC-4 `application.yml` declares `server.port: 8085`, `spring.application.name: conv-service`, and datasource/Eureka stubs

## Dependencias
Nenhuma.

## Estimativa
S

## Prioridade
P1
