# HIST — Local Setup

> Service: `hist-service` · Java 21 / Spring Boot · Gradle (Kotlin DSL) · module `:hist-service`.
> HTTP port **8083** (the port the five producers already target: `HIST_BASE_URL=http://localhost:8083`).

## Local dependencies

- **PostgreSQL** — append-only store, schema-per-tenant (`t_<tenantId>`) + `neuroassist_global`.
- **ACS (`acs-service`)** — JWKS endpoint for JWT validation + service-client identity for producers.
- **MIG (`neuroassist-niv-migrations`)** — applies HIST Flyway scripts (`V0060`–`V0069`). HIST does not
  run Flyway at start.
- No message broker (messaging disabled). No TechLab AI.

## Environment variables

```
SERVER_PORT=8083
SERVER_SERVLET_CONTEXT_PATH=/hist          # D-640 controller base path
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/neuroassist
SPRING_DATASOURCE_USERNAME=hist_app
SPRING_DATASOURCE_PASSWORD=***
ACS_JWKS_URI=http://localhost:8081/acs/.well-known/jwks.json
HIST_IMMUTABILITY_MODE=grants               # ADR-002 Option A (hash-chain reserved)
HIST_AUDIT_FAILURE_PROFILE=prod             # dev = log-only; prod = producer policy applies
```

> **Producer config (reconciliation, D-640):** each producer must set
> `HIST_BASE_URL=http://localhost:8083/hist` so `POST {hist.baseUrl}/audit` → `POST /hist/audit`.
> This is the only producer-side change (configuration value, not code).

## Commands (Java stack)

| Action | Command |
|---|---|
| Install deps / build | `./gradlew :hist-service:build` |
| Run locally | `./gradlew :hist-service:bootRun` |
| Test | `./gradlew :hist-service:test` |

## Smoke

```
# append (service-client token)
curl -X POST http://localhost:8083/hist/audit -H "Authorization: Bearer $SVC" \
  -H "X-Correlation-Id: corr-dev-1" -H "Content-Type: application/json" \
  -d '{"action":"AlarmConfirmed","source":"evnt-service","actorType":"caregiver","tenantId":"t-1","subjectType":"event","subjectId":"evt-1","occurredAt":"2026-11-20T16:40:12.482Z","correlationId":"corr-dev-1"}'

# caregiver timeline
curl http://localhost:8083/hist/patients/pat-1/history?period=today -H "Authorization: Bearer $CG"
```
