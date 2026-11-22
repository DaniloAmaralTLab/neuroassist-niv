# ACS — Local Setup

> Service: `acs-service` · Module **ACS — Caregivers and Access** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · Gradle (Kotlin DSL) · PostgreSQL · Flyway (applied by MIG).

## HTTP port

`acs-service` listens on **`8081`** (GWY `8080`, REG `8761`). This is the port the
`generator-config.yml` / scaffold reads.

## Local dependencies

| Dependency | Why | Local default |
|---|---|---|
| PostgreSQL | `neuroassist_global` + `t_<tenantId>` schemas | `localhost:5432/neuroassist` |
| Service Registry (REG / Eureka) | discovery of `hist-service` | `http://localhost:8761/eureka` |
| MIG (`neuroassist-niv-migrations`) | applies ACS Flyway scripts (all schemas) | run before first start |
| HIST (`hist-service`) | audit sink (sync REST) | `http://localhost:8083/hist` (base URL includes `/hist`, D-640; tolerant: enqueue on failure for commit+durable-retry actions, ADR-005) |

No message broker, no TechLab AI hub, no external IdP (messaging disabled; `ai.hasAi = false`).

## Environment variables

```
SERVER_PORT=8081
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/neuroassist
SPRING_DATASOURCE_USERNAME=neuroassist
SPRING_DATASOURCE_PASSWORD=change-me
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka
ACS_JWT_ISSUER=https://neuroassist/acs
ACS_JWT_KEY_PATH=./config/acs-signing-key.pem      # dev signing key (JWKS served from this)
HIST_BASE_URL=http://localhost:8083/hist      # base URL MUST include /hist (D-640); {hist.baseUrl}/audit -> /hist/audit
# TLS mandatory outside localhost (TECH-006); internal network only (OPS-002)
```

## Commands (Java stack)

| Action | Command |
|---|---|
| Install / build | `./gradlew :acs-service:build` |
| Run local | `./gradlew :acs-service:bootRun` |
| Test | `./gradlew :acs-service:test` |

Migrations are **not** run at service start — apply them via MIG against
`neuroassist_global` and each `t_<tenantId>` schema first.
