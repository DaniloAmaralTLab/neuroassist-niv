# PAT — Local Setup

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · Gradle (Kotlin DSL) · PostgreSQL · Flyway (applied by MIG).

## HTTP port

`pat-service` listens on **`8082`** (GWY `8080`, ACS `8081`, HIST `8083`, REG `8761`). This is
the port the `generator-config.yml` / scaffold reads.

## Local dependencies

| Dependency | Why | Local default |
|---|---|---|
| PostgreSQL | `neuroassist_global` (gesture_type) + `t_<tenantId>` (patient, command) schemas | `localhost:5432/neuroassist` |
| Service Registry (REG / Eureka) | discovery of `acs-service`, `hist-service` | `http://localhost:8761/eureka` |
| ACS (`acs-service`) | JWKS verification + revocation-aware introspection | `http://localhost:8081` |
| MIG (`neuroassist-niv-migrations`) | applies PAT Flyway `V0020+` (all schemas) | run before first start |
| HIST (`hist-service`) | audit sink (sync REST) | `http://localhost:8083/hist` (base URL includes `/hist`, D-640; dev: log-only if unavailable) |

No message broker, no TechLab AI hub, no external IdP (messaging disabled; `ai.hasAi = false`).

## Environment variables

```
SERVER_PORT=8082
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/neuroassist
SPRING_DATASOURCE_USERNAME=neuroassist
SPRING_DATASOURCE_PASSWORD=change-me
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka
ACS_BASE_URL=http://localhost:8081
ACS_JWKS_URI=http://localhost:8081/acs/.well-known/jwks.json
HIST_BASE_URL=http://localhost:8083/hist      # base URL MUST include /hist (D-640); {hist.baseUrl}/audit -> /hist/audit
# TLS mandatory outside localhost; internal network only
```

## Commands (Java stack)

| Action | Command |
|---|---|
| Install / build | `./gradlew :pat-service:build` |
| Run local | `./gradlew :pat-service:bootRun` |
| Test | `./gradlew :pat-service:test` |

Migrations are **not** run at service start — apply them via MIG against `neuroassist_global`
and each `t_<tenantId>` schema first (`V0020` global before `V0021` per-tenant).
