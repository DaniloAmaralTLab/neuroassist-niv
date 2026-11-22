# EDGE — Local Setup

> Service: `edge-service` · Module **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · Gradle (Kotlin DSL) · PostgreSQL · Flyway (applied by MIG).

## HTTP port

`edge-service` listens on **`8084`** (GWY `8080`, ACS `8081`, PAT `8082`, HIST `8083`, REG `8761`).
This is the port the `generator-config.yml` / scaffold reads.

## Local dependencies

| Dependency | Why | Local default |
|---|---|---|
| PostgreSQL | `neuroassist_global` (`device_pairing_code`) + `t_<tenantId>` (`edge_device`, `edge_credential_revocation`, `cached_catalog`) | `localhost:5432/neuroassist` |
| Service Registry (REG / Eureka) | discovery of `acs-service`, `pat-service`, `hist-service` | `http://localhost:8761/eureka` |
| ACS (`acs-service`) | JWKS verification of human tokens + introspection + the `edge-service` service-client token (G2) | `http://localhost:8081` |
| PAT (`pat-service`) | catalog pull (`GET /pat/patients/{id}/commands`, ETag/304) | `http://localhost:8082` |
| MIG (`neuroassist-niv-migrations`) | applies EDGE Flyway `V0030`–`V0032` (all schemas) | run before first start |
| HIST (`hist-service`) | audit sink (sync REST) | `http://localhost:8083/hist` (base URL includes `/hist`, D-640; dev: log-only if unavailable) |
| EVNT (`evnt-service`) | detection-lapse raise/resolve sink (ADR-005, G6; sync REST, service-client) | `http://localhost:8086` (endpoint EVNT-owned — INT TODO[architect]) |

No message broker, no TechLab AI hub, no external IdP (messaging disabled; `ai.hasAi = false`).

## Environment variables

```
SERVER_PORT=8084
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/neuroassist
SPRING_DATASOURCE_USERNAME=neuroassist
SPRING_DATASOURCE_PASSWORD=change-me
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka
ACS_BASE_URL=http://localhost:8081
ACS_JWKS_URI=http://localhost:8081/acs/.well-known/jwks.json
PAT_BASE_URL=http://localhost:8082
HIST_BASE_URL=http://localhost:8083/hist      # base URL MUST include /hist (D-640); {hist.baseUrl}/audit -> /hist/audit
# EVNT detection-lapse escalation (ADR-005, SAFETY-GEST-1): EDGE raises/resolves lapses to EVNT
EVNT_BASE_URL=http://localhost:8086
# EDGE device-token signing (ADR-002): EDGE mints edge.device tokens and publishes its own JWKS
EDGE_DEVICE_TOKEN_SIGNING_KEY_ALIAS=edge-device-signing
EDGE_DEVICE_TOKEN_TTL_SECONDS=900
EDGE_HEARTBEAT_OFFLINE_THRESHOLD_SECONDS=90
EDGE_WATCHDOG_SCAN_INTERVAL_SECONDS=30
EDGE_PAIRING_CODE_TTL_SECONDS=600
# Detection-lapse sweep (ADR-005): N = threshold before a non-RUNNING/silent paired device lapses
EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS=120
EDGE_DETECTION_LAPSE_SWEEP_INTERVAL_SECONDS=30
# TLS mandatory outside localhost; internal network only (TECH-006, OPS-002)
```

## Commands (Java stack)

| Action | Command |
|---|---|
| Install deps / build | `./gradlew :edge-service:build` |
| Run local | `./gradlew :edge-service:bootRun` |
| Test | `./gradlew :edge-service:test` |

## Notes

- The **heartbeat watchdog** is an in-process `@Scheduled` job; tune
  `EDGE_HEARTBEAT_OFFLINE_THRESHOLD_SECONDS` conservatively on mobile (Risk R1).
- The **detection-lapse sweep** (ADR-005) is a second in-process `@Scheduled` job; tune
  `EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS` (default 120 s) against alarm latency vs false alarms
  (Risk R6). It raises/resolves lapses to EVNT over sync REST (service-client); on EVNT outage the
  episode stays open and is retried, never dropped (safety-critical).
- The **pairing code** is returned once at enroll and hashed at rest; never re-exposed (Risk R2).
- EDGE's device-facing read path (`GET /edge/catalog`) must survive a PAT outage (INV-EDGE-5): the
  cache is served and `GET /edge/health` never hard-fails on ACS/PAT reachability alone.
