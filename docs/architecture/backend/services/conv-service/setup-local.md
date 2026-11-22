# CONV — Local Setup

> Service: `conv-service` · Java 21 / Spring Boot · Gradle (Kotlin DSL) · **HTTP port 8085**.

## Dependencies (local)

- PostgreSQL (schema-per-tenant; `conv` schema per tenant). Engine `postgresql`.
- Blob/object storage for audio bytes (local MinIO/filesystem adapter in dev).
- Hub services: **ACS** (JWKS), **PAT**, **HIST** reachable; **MIG** applies migrations.
- No broker (messaging disabled). No TechLab AI. No TTS vendor (TRN concern).

## Environment variables

| Variable | Example | Purpose |
|---|---|---|
| `SERVER_PORT` | `8085` | HTTP port |
| `NEUROASSIST_ACS_BASE_URL` | `http://localhost:8081/acs` | ACS base (JWKS) |
| `NEUROASSIST_ACS_JWKS_URI` | `http://localhost:8081/acs/.well-known/jwks.json` | patient-session/service-client token validation |
| `NEUROASSIST_PAT_BASE_URL` | `http://localhost:8082/pat` | PAT reference read |
| `NEUROASSIST_HIST_BASE_URL` | `http://localhost:8086/hist` | HIST audit (base includes `/hist`) |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/neuroassist` | Postgres |
| `CONV_AUDIO_STORAGE_ENDPOINT` | `http://localhost:9000` | blob storage (AudioAssetPort) |
| `CONV_USAGE_RETENTION_DAYS` | `90` | usage-signal retention (INV-CONV-6) |

## Commands (Java stack)

```bash
# install deps / build
./gradlew :conv-service:build

# run locally
./gradlew :conv-service:bootRun

# test
./gradlew :conv-service:test
```

> HTTP port **8085** here matches `generator-config.yml` (`port: 8085`). Migrations are owned by MIG
> (Flyway block V0070–V0079, `contracts/data-model.md` §4) — CONV ships no runner.
