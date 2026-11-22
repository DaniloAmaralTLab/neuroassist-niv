# trn-service

Trn — Serviço de domínio NeuroAssist NIV tool.

## Stack

- Java 21 (eclipse-temurin:21)
- Spring Boot 3.5.11 + Gradle 8.x
-  (schema-per-tenant: `t_<tenantId>`, migrations em neuroassist-niv-migrations)
- ActiveMQ Artemis
- Spring Cloud TRN (Eureka + OpenFeign + Resilience4j)

## Como buildar

```bash
./gradlew :trn-service:build
./gradlew :trn-service:architectureCheck  # bloqueante — rodar antes de commit
```

## Como testar

```bash
./gradlew :trn-service:test              # unitários (sem Docker)
./gradlew :trn-service:integrationTest   # integração (requer Docker)
```

## Como rodar localmente

```bash
docker compose up -d
./gradlew :trn-service:bootRun --args='--spring.profiles.active=local'
```

Disponível em: `http://localhost:8089`

## Referências

- [Setup Local](../../docs/architecture/tools/trn-service/setup-local.md)
- [Service Spec](../../docs\architecture\backend\services\trn-service\trn-service-spec.md)
- [ADRs](../../docs/architecture/tools/trn-service/adr/README.md)
- [CLAUDE.md](../../CLAUDE.md)
