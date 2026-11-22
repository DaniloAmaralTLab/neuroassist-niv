# pat-service

neuroassist-niv — Serviço de domínio NeuroAssist NIV tool.

## Stack

- Java 21 (eclipse-temurin:21)
- Spring Boot 3.5.11 + Gradle 8.x
-  (schema-per-tenant: `t_<tenantId>`, migrations em neuroassist-niv-migrations)
- ActiveMQ Artemis
- Spring Cloud PAT (Eureka + OpenFeign + Resilience4j)

## Como buildar

```bash
./gradlew :pat-service:build
./gradlew :pat-service:architectureCheck  # bloqueante — rodar antes de commit
```

## Como testar

```bash
./gradlew :pat-service:test              # unitários (sem Docker)
./gradlew :pat-service:integrationTest   # integração (requer Docker)
```

## Como rodar localmente

```bash
docker compose up -d
./gradlew :pat-service:bootRun --args='--spring.profiles.active=local'
```

Disponível em: `http://localhost:8082`

## Referências

- [Setup Local](../../docs/architecture/tools/pat-service/setup-local.md)
- [Service Spec](../../docs\architecture\backend\services\pat-service\pat-service-spec.md)
- [ADRs](../../docs/architecture/tools/pat-service/adr/README.md)
- [CLAUDE.md](../../CLAUDE.md)
