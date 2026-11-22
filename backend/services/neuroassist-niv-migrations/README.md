# neuroassist-niv-migrations

NeuroassistNivMigrations — Serviço de domínio NeuroAssist NIV tool.

## Stack

- Java 21 (eclipse-temurin:21)
- Spring Boot 3.5.11 + Gradle 8.x
-  (schema-per-tenant: `t_<tenantId>`, migrations em neuroassist-niv-migrations)
- ActiveMQ Artemis
- Spring Cloud MIG (Eureka + OpenFeign + Resilience4j)

## Como buildar

```bash
./gradlew :neuroassist-niv-migrations:build
./gradlew :neuroassist-niv-migrations:architectureCheck  # bloqueante — rodar antes de commit
```

## Como testar

```bash
./gradlew :neuroassist-niv-migrations:test              # unitários (sem Docker)
./gradlew :neuroassist-niv-migrations:integrationTest   # integração (requer Docker)
```

## Como rodar localmente

```bash
docker compose up -d
./gradlew :neuroassist-niv-migrations:bootRun --args='--spring.profiles.active=local'
```

Disponível em: `http://localhost:8090`

## Referências

- [Setup Local](../../docs/architecture/tools/neuroassist-niv-migrations/setup-local.md)
- [Service Spec](../../docs\architecture\backend\services\neuroassist-niv-migrations\neuroassist-niv-migrations-spec.md)
- [ADRs](../../docs/architecture/tools/neuroassist-niv-migrations/adr/README.md)
- [CLAUDE.md](../../CLAUDE.md)
