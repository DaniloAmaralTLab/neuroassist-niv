# neuroassist-niv-service-registry

NeuroassistNivServiceRegistry — Serviço de domínio NeuroAssist NIV tool.

## Stack

- Java 21 (eclipse-temurin:21)
- Spring Boot 3.5.11 + Gradle 8.x
-  (schema-per-tenant: `t_<tenantId>`, migrations em neuroassist-niv-migrations)
- ActiveMQ Artemis
- Spring Cloud REG (Eureka + OpenFeign + Resilience4j)

## Como buildar

```bash
./gradlew :neuroassist-niv-service-registry:build
./gradlew :neuroassist-niv-service-registry:architectureCheck  # bloqueante — rodar antes de commit
```

## Como testar

```bash
./gradlew :neuroassist-niv-service-registry:test              # unitários (sem Docker)
./gradlew :neuroassist-niv-service-registry:integrationTest   # integração (requer Docker)
```

## Como rodar localmente

```bash
docker compose up -d
./gradlew :neuroassist-niv-service-registry:bootRun --args='--spring.profiles.active=local'
```

Disponível em: `http://localhost:8761`

## Referências

- [Setup Local](../../docs/architecture/tools/neuroassist-niv-service-registry/setup-local.md)
- [Service Spec](../../docs\architecture\backend\services\neuroassist-niv-service-registry\neuroassist-niv-service-registry-spec.md)
- [ADRs](../../docs/architecture/tools/neuroassist-niv-service-registry/adr/README.md)
- [CLAUDE.md](../../CLAUDE.md)
