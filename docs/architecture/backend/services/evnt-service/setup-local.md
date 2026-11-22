# EVNT — Local Setup

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · Gradle (Kotlin DSL). Module `:evnt-service` in the backend root.

## HTTP port

- `evnt-service` listens on **`8086`** (the scaffold `generator-config.yml` reads this value; keep it
  in sync with REG registration and `GWY` route `/evnt/**`). Confirm against the port map at scaffold
  if a collision is reported.

## Local dependencies

| Dependency | Why | Local |
|---|---|---|
| PostgreSQL | `event` table (schema-per-tenant) | shared project Postgres; EVNT migrations applied by MIG |
| EDGE (`edge-service`) | `edge.device` JWKS + introspection (ingest trust) | run `edge-service` locally or stub JWKS |
| PAT (`pat-service`) | `GET /pat/commands/{id}` (urgency+label snapshot) | run `pat-service` or stub |
| ACS (`acs-service`) | caregiver JWKS + introspect + links | run `acs-service` or stub |
| HIST (`hist-service`) | `POST {hist.baseUrl}/audit` (base URL incl. `/hist`, D-640) | run or stub (dev log-only degrade) |
| REG / GWY | discovery + gateway | optional locally; `*.base-url` fallback |

## Environment variables

```
EVNT_SERVER_PORT=8086
EVNT_DB_URL=jdbc:postgresql://localhost:5432/neuroassist
EVNT_DB_USER=neuroassist
EVNT_DB_PASSWORD=...
EDGE_BASE_URL=http://localhost:8084
PAT_BASE_URL=http://localhost:8082
ACS_BASE_URL=http://localhost:8081
HIST_BASE_URL=http://localhost:8083/hist      # HIST runs on 8083; base URL MUST include /hist (D-640); {hist.baseUrl}/audit -> /hist/audit
EVNT_SERVICE_CLIENT_ID=evnt-service           # ACS client-credentials principal (TODO[architect])
EVNT_SERVICE_CLIENT_SECRET=...                 # minting path confirmed at scaffold
EVNT_ACTIVE_ALARM_POLL_SECONDS=3               # advertised to the client via pollIntervalSeconds

# Out-of-band escalation (ADR-005 / SPEC-11)
EVNT_ESCALATION_SWEEP_SECONDS=5                 # scheduled sweep over unconfirmed emergencies
EVNT_ESCALATION_PUSH_AFTER_SECONDS=0            # Tier 0 Web Push (on commit)
EVNT_ESCALATION_SMS_AFTER_SECONDS=30            # Tier 1 SMS if still unconfirmed
EVNT_ESCALATION_VOICE_AFTER_SECONDS=90          # Tier 2 voice if still unconfirmed
EVNT_ESCALATION_PROVIDER_MAX_RETRIES=2          # per-tier capped backoff before advancing
EVNT_ESCALATION_SMS_ENABLED=false               # enable once AWS End User Messaging provisioned (TODO[architect])
EVNT_ESCALATION_VOICE_ENABLED=false             # idem
EVNT_WEBPUSH_VAPID_PUBLIC_KEY=...               # VAPID key pair (Tier 0)
EVNT_WEBPUSH_VAPID_PRIVATE_KEY=...
AWS_REGION=<project-selected-region>            # AWS End User Messaging — selected Region only (no cross-Region)
```

> **Local note:** telephony tiers are `*_ENABLED=false` by default so local runs never hit AWS.
> Web Push works locally with a self-generated VAPID key pair. Enabling SMS/voice requires confirming
> the AWS project Region, +55 origination, and account plan (integration-contracts §8).

## Commands (java stack)

| Action | Command |
|---|---|
| Install deps / build | `./gradlew :evnt-service:build` |
| Run local | `./gradlew :evnt-service:bootRun` |
| Test | `./gradlew :evnt-service:test` |
