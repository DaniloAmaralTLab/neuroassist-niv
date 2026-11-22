# TRN — Local Setup

> Service: `trn-service` · Stack: Java 21 / Spring Boot (Gradle, Kotlin DSL) · PostgreSQL ·
> **schema-per-tenant** · Messaging **disabled** · Local HTTP port **8089**.

## Local dependencies

| Dependency | Why | Note |
|---|---|---|
| PostgreSQL | authoring persistence (schema-per-tenant) | migrations applied by **MIG** (block `V0080–V0089`); TRN owns no Flyway runner |
| ACS (`:8081`) | JWKS to validate the caregiver JWT; mints the TRN service-client token | resource-server config points at ACS JWKS |
| PAT (`:8082`) | `pat.patient.read` (patient reference) | service-client, ETag/304 |
| HIST (`:8083`) | `hist.audit.record` (governance facts) | base URL includes `/hist` |
| CONV (`:8085`) | publish / retire / erase approved versions | TRN service-client token |
| REG / Eureka (`:8761`) | service discovery | `EUREKA_URI` default `http://localhost:8761/eureka` |
| Anthropic Claude | `LlmDialogPort` (authoring dialog) | API key via secret; off the patient path |
| ElevenLabs | `TtsPort` (voice synthesis) | API key via secret; consent-gated |
| Elasticsearch | `SearchIndexPort` (approved-content index) | authoring-side only; non-blocking |
| Blob/object storage | voice samples + synthesized audio bytes | under a per-subject crypto key |

> No broker (messaging disabled). No TechLab AI (`techlab-ai`) dependency.

## Environment variables

| Variable | Example / default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8089` | local HTTP port (8086 is EVNT — do not reuse) |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/neuroassist` | Postgres |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | `neuroassist` / `***` | DB credentials |
| `EUREKA_URI` | `http://localhost:8761/eureka` | service registry |
| `NEUROASSIST_ACS_JWKS_URI` | `http://localhost:8081/acs/.well-known/jwks.json` | caregiver-token validation |
| `NEUROASSIST_PAT_BASE_URL` | `http://localhost:8082/pat` | PAT reference reads |
| `NEUROASSIST_HIST_BASE_URL` | `http://localhost:8083/hist` | HIST audit ingest |
| `NEUROASSIST_CONV_BASE_URL` | `http://localhost:8085/conv` | CONV publish/retire/erase |
| `ANTHROPIC_API_KEY` | `***` | LLM dialog (secret) |
| `ELEVENLABS_API_KEY` | `***` | voice synthesis (secret) |
| `NEUROASSIST_ES_URIS` | `http://localhost:9200` | approved-content index |
| `NEUROASSIST_TRN_CRYPTO_KEYSTORE` | `file:/secrets/trn-subject-keys` | per-subject crypto-key store (ADR-005) |

## Build and run (java)

```bash
./gradlew :trn-service:build       # install deps + compile
./gradlew :trn-service:bootRun     # run locally on :8089
./gradlew :trn-service:test        # unit + slice + BDD tests
```

> The HTTP port declared here (**8089**) is the same value the `generator-config.yml` carries at scaffold
> time. Port map (06 §Gaps): GWY 8080, ACS 8081, PAT 8082, HIST 8083, EDGE 8084, CONV 8085, EVNT 8086,
> GEST 8088, **TRN 8089**, REG 8761.
