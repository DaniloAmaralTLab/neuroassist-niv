# EVNT-001 -- Create evnt-service hexagonal package skeleton and Gradle module

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Bootstraps the `evnt-service` Gradle module in the backend multi-project build. Creates the four
hexagonal layer packages (`api`, `application`, `domain`, `infrastructure`) under
`com.neuroassist.evnt`, the Spring Boot entry-point class, and the `build.gradle.kts` with the
standard stack dependencies (Spring Boot Web, Security, Data JPA, Actuator; ADR-001-hexagonal-architecture.md).
No business logic lives here — this issue is the prerequisite for every EVNT-NNN that follows.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/evnt-service-spec.md
- docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/.gitkeep`
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/.gitkeep`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/.gitkeep`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/.gitkeep`
- [ ] implementar `src/main/java/com/neuroassist/evnt/EvntServiceApplication.java`
- [ ] implementar `build.gradle.kts`
- [ ] registrar `:evnt-service` em `settings.gradle.kts` do backend root
- [ ] verificar `./gradlew :evnt-service:compileJava` sem erros

## Criterios de aceite
- [ ] AC-1 `./gradlew :evnt-service:compileJava` exits 0 with zero compilation errors
- [ ] AC-2 Four hexagonal packages `api/application/domain/infrastructure` exist under `com.neuroassist.evnt`
- [ ] AC-3 `EvntServiceApplication` starts with `@SpringBootApplication` and exits cleanly in test mode
- [ ] AC-4 ArchUnit layer rules from ADR-001-hexagonal-architecture.md apply without violation on the empty skeleton

## Dependencias
Nenhuma (issue inicial).

## Estimativa
S

## Prioridade
P1
