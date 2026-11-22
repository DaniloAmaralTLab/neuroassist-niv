# HIST — Integration Contracts

> Service: `hist-service` · Module **HIST** · sync REST only. EARS: `../../../standards/ears-notation.md`.

## 1. Inbound write — producers → `POST /hist/audit`

| Peer | Transport | Auth | Notes |
|---|---|---|---|
| ACS, PAT, EDGE, EVNT, GEST | `POST {hist.baseUrl}/audit` sync REST, TLS outside localhost | service-client JWT, `X-Correlation-Id` echoed | reconciled envelope (`event-contracts.md`) |

### Path reconciliation (D-640) — final URL and the single config change

- Producers keep the **exact literal** call `POST {hist.baseUrl}/audit` (no code or contract change).
- HIST's controller base path is `/hist` (D-640 `base_path`); the resource path is `/audit`.
- **Final URL: `POST /hist/audit`.**
- The **only** change is a **configuration value**: each producer's `hist.base-url` / `HIST_BASE_URL`
  must resolve to the HIST service root **including** `/hist`. Producers currently set
  `HIST_BASE_URL=http://localhost:8083` (no `/hist`); they must set
  `HIST_BASE_URL=http://localhost:8083/hist` (dev) so `{hist.baseUrl}/audit` → `http://localhost:8083/hist/audit`.
  Via REG/gateway the resolved base is `lb://hist-service/hist`.

- THE SYSTEM SHALL serve the ingest at `/hist/audit` (D-640).
- WHEN `hist.base-url` resolves without the `/hist` segment, THEN the producer's `POST {hist.baseUrl}/audit`
  SHALL miss the controller (`404`) — so the config value MUST include `/hist`.

## 2. Failure policy (ADR-005) — producer-side contract

`POST /hist/audit` is in-band and synchronous, so **HIST is a synchronous dependency of every write
path** (blast radius, doc 06 R1). The reconciled policy (ADR-005, accepted) is the authoritative
classification in `event-contracts.md` §3:

| Fact class | On HIST failure (prod) | Dev |
|---|---|---|
| hard-502 (20 facts) | producer rolls back the use case, returns `502 audit-unavailable` | log-only |
| commit+durable-retry (16 facts) | producer commits local change + enqueues durable idempotent audit retry | log-only |

- WHEN a commit+durable-retry fact's `POST /hist/audit` fails in prod, THE producer SHALL keep the
  committed change and enqueue the envelope for idempotent retry (durable retry contract,
  `event-contracts.md` §3).
- WHILE the backlog of un-audited committed actions grows past threshold, THE producer SHALL raise a
  reconciliation alert (ADR-005 consequence).
- THE HIST availability SLO SHALL be ≥ 99.9% (HA deployment, fast restart) because the hard-502 set
  gates most writes (ADR-005, doc 06 R1).

## 3. Inbound read — DASH / caregiver → `GET /hist/...`

| Peer | Transport | Auth | Notes |
|---|---|---|---|
| DASH / caregiver dashboard | `GET {hist.baseUrl}/hist/patients/{patientId}/history` | caregiver JWT (ACS) | patient + tenant scoped (INV-HIST-6) |
| Compliance operator | `GET {hist.baseUrl}/hist/audit` | operator JWT, `hist.audit.read` | full trail, incident reconstruction |

- THE SYSTEM SHALL enforce caregiver→patient link scoping with the **same rule as EVNT**
  `PatientEventService`: tenant derived from the JWT, and the caregiver must be linked to `patientId`;
  IF not linked, THEN `403` and no record is leaked (INV-HIST-6).

## 4. Downstream dependency — PostgreSQL

| Peer | Transport | Notes |
|---|---|---|
| PostgreSQL | JDBC | append-only store; immutability via grants (INSERT/SELECT only on audit tables) |

## 5. Resilience

- No circuit breaker is required **outbound** from HIST (HIST calls no downstream service on the audit
  path; it only reads/writes PostgreSQL). Resilience is the producers' concern (durable retry, §2).
- WHILE PostgreSQL is unavailable, THE SYSTEM SHALL fail the ingest so the producer's failure policy
  (hard-502 or durable-retry) applies — HIST never acknowledges a write it did not durably append.
- No external SDK, rate limit or third-party SLA applies (no external systems; `ai.hasAi = false`).
