# neuroassist-niv-api-gateway

NeuroassistNivApiGateway — Serviço de domínio NeuroAssist NIV tool.

## Stack

- Java 21 (eclipse-temurin:21)
- Spring Boot 3.5.11 + Gradle 8.x
-  (schema-per-tenant: `t_<tenantId>`, migrations em neuroassist-niv-migrations)
- ActiveMQ Artemis
- Spring Cloud GWY (Eureka + OpenFeign + Resilience4j)

## Como buildar

```bash
./gradlew :neuroassist-niv-api-gateway:build
./gradlew :neuroassist-niv-api-gateway:architectureCheck  # bloqueante — rodar antes de commit
```

## Como testar

```bash
./gradlew :neuroassist-niv-api-gateway:test              # unitários (sem Docker)
./gradlew :neuroassist-niv-api-gateway:integrationTest   # integração (requer Docker)
```

## Como rodar localmente

```bash
docker compose up -d
./gradlew :neuroassist-niv-api-gateway:bootRun --args='--spring.profiles.active=local'
```

Disponível em: `http://localhost:8080`

## Referências

- [Setup Local](../../docs/architecture/tools/neuroassist-niv-api-gateway/setup-local.md)
- [Service Spec](../../docs\architecture\backend\services\neuroassist-niv-api-gateway\neuroassist-niv-api-gateway-spec.md)
- [ADRs](../../docs/architecture/tools/neuroassist-niv-api-gateway/adr/README.md)
- [CLAUDE.md](../../CLAUDE.md)
