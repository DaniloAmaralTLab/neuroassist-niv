# GEST — Local Setup

> Service: `gest-service` · Module **GEST** · Stack: Java 21 / Spring Boot (Gradle Kotlin DSL).

## HTTP port

`gest-service` listens on **`8088`** (GWY `8080`, ACS `8081`, PAT `8082`, HIST `8083`, EDGE `8084`,
EVNT `8086`, REG `8761`). This is the value the scaffold `generator-config.yml` reads; keep it in sync.

## Local dependencies

| Dependency | Role | Local URL |
|---|---|---|
| PostgreSQL | global schema `neuroassist_global` (engine_version, engine_capability) | `localhost:5432` |
| ACS (`acs-service`) | JWKS verification + introspection on writes | `http://localhost:8081` |
| PAT (`pat-service`) | `GET /pat/gesture-types` — code validation on declare (INV-GEST-1) | `http://localhost:8082` |
| HIST (`hist-service`) | audit sink (sync REST) | `http://localhost:8083/hist` (base URL includes `/hist`, D-640) |
| REG (`service-registry`) | Eureka discovery | `http://localhost:8761` |

> No broker (messaging disabled). No EDGE/EVNT dependency.

## Environment variables

```
SERVER_PORT=8088
DB_URL=jdbc:postgresql://localhost:5432/neuroassist
DB_SCHEMA=neuroassist_global
ACS_BASE_URL=http://localhost:8081
ACS_JWKS_URI=http://localhost:8081/acs/.well-known/jwks.json
PAT_BASE_URL=http://localhost:8082
HIST_BASE_URL=http://localhost:8083/hist      # base URL MUST include /hist (D-640); {hist.baseUrl}/audit -> /hist/audit
EUREKA_URL=http://localhost:8761/eureka
```

## Build / run / test

```bash
./gradlew :gest-service:build      # install deps + compile
./gradlew :gest-service:bootRun    # run locally on 8088
./gradlew :gest-service:test       # unit + slice + BDD
```
