# HIST-001 -- Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

Foundation issue. Creates the four-layer package skeleton (`api` / `application` / `domain` /
`infrastructure`) for `hist-service` and the Gradle build file with the `integrationTest` / `test`
split required by D-636: without `tasks.test { exclude("**/*IT.class") }`, the plain `test` task
picks up `CucumberIT` and similar IT classes, which require the full Spring context and cascade into
`DefaultCacheAwareContextLoaderDelegate` failures for every unimplemented port (expected at P1).
`application.yml` wires port `8083`, Eureka registration, and datasource stubs.

## Spec de referencia

- SPEC-01 (api surface — base path `/hist`, port 8083)
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`)

## Escopo

- [ ] implementar `backend/services/hist-service/build.gradle.kts`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/.gitkeep`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/.gitkeep`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/.gitkeep`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/.gitkeep`
- [ ] implementar `backend/services/hist-service/src/main/resources/application.yml`
- [ ] registrar `hist-service` no `backend/settings.gradle.kts` root include
- [ ] adicionar `hist-service` ao `backend/docker-compose.dev.yml` stub

## Criterios de aceite

- [ ] AC-1 `./gradlew :hist-service:compileJava` exits 0
- [ ] AC-2 `build.gradle.kts` contains `tasks.test { exclude("**/*IT.class") }` and a separate `integrationTest` task (D-636)
- [ ] AC-3 Four package directories exist under `src/main/java/com/neuroassist/hist/`: `api/`, `application/`, `domain/`, `infrastructure/`
- [ ] AC-4 `application.yml` declares `server.port: 8083`, `spring.application.name: hist-service`, datasource and Eureka stubs

## Dependencias

Nenhuma.

## Estimativa

S

## Prioridade
P1
