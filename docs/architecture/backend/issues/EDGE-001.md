# EDGE-001 -- Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Foundation issue. Creates the four-layer package skeleton (`api` / `application` / `domain` /
`infrastructure`) for `edge-service` and the Gradle build file with the `integrationTest`/`test`
split. Without `tasks.test { exclude("**/*IT.class") }`, the plain `test` task picks up `CucumberIT`
and Spring context failures for unimplemented ports. `application.yml` wires port 8084 (setup-local.md),
Eureka and datasource stubs (`spring.flyway.enabled=false`; MIG applies Flyway). ADR:
`docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`).

## Spec de referencia
- SPEC-01 (api surface — base path /edge, port 8084)
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`)

## Escopo
- [ ] implementar `backend/services/edge-service/build.gradle.kts`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/.gitkeep`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/.gitkeep`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/.gitkeep`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/.gitkeep`
- [ ] implementar `backend/services/edge-service/src/main/resources/application.yml`
- [ ] registrar `edge-service` em `backend/settings.gradle.kts`

## Criterios de aceite
- [ ] AC-1 `./gradlew :edge-service:compileJava` exits 0 com as quatro camadas presentes
- [ ] AC-2 `./gradlew :edge-service:test` nao executa classes `*IT` (integrationTest excludes)
- [ ] AC-3 `application.yml` configura `server.port=8084`, `spring.flyway.enabled=false` e stub de datasource

## Dependencias
Nenhuma.

## Estimativa
S

## Prioridade
P1
