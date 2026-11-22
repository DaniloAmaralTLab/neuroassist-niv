# GEST-001 -- Gradle module scaffold and Spring Boot entry point for gest-service

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Create the `gest-service` Gradle submodule and its Spring Boot entry point. This is the foundational
scaffold that all subsequent GEST issues depend on. The service runs on port 8088, registers with
Eureka, and validates JWKS-trusted JWTs from ACS. No business logic is implemented here.

## Spec de referencia
- SPEC-01 (API surface — base path /gest, port 8088)
- docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md (hexagonal_java key)

## Escopo
- [ ] implementar `build.gradle.kts`
- [ ] implementar `src/main/java/com/neuroassist/gest/GestApplication.java`
- [ ] implementar `src/main/resources/application.yml`

## Resultado esperado
A runnable Spring Boot application on port 8088 with Eureka client registration and an empty `/gest`
base path. `./gradlew :gest-service:compileJava` exits 0.

## Criterios de aceite
- [ ] AC-1: `./gradlew :gest-service:compileJava` exits 0 with no warnings about missing dependencies.
- [ ] AC-2: `application.yml` declares `server.port: 8088`, Eureka client, and Spring Security OAuth2
  resource server JWKS URI property `${ACS_JWKS_URI}`.
- [ ] AC-3: Package root is `com.neuroassist.gest`; hexagonal layer packages `api`, `application`,
  `domain`, `infrastructure` are declared (may be empty stubs).

## Dependencias
Nenhuma.

## Estimativa
M

## Prioridade
P1
