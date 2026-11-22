# SPEC-10 — Integrations

> Contract: `../../contracts/integration-contracts.md`, `../../contracts/hub-integration.md`.

## Objective

Enumerate HIST's synchronous integrations and the single producer-side configuration change required by
the path reconciliation (D-640).

## Scope

- **In** — inbound producer writes, inbound reads (DASH/operator), ACS identity, MIG migrations,
  PostgreSQL; the `hist.base-url` config change.
- **Out** — external SDKs, TechLab AI, message brokers (none).

## Integrations

| Peer | Direction | Transport | Auth |
|---|---|---|---|
| ACS, PAT, EDGE, EVNT, GEST | inbound write | `POST /hist/audit` | service-client JWT |
| DASH / caregiver | inbound read | `GET /hist/patients/{id}/history` | caregiver JWT |
| compliance operator | inbound read | `GET /hist/audit` | operator JWT |
| ACS | dependency | JWKS | — |
| MIG | dependency | Flyway (V0060–V0069) | — |
| PostgreSQL | dependency | JDBC | DB role |

## Path reconciliation (D-640) — the one required producer change

- Final URL `POST /hist/audit`; call-site template `POST {hist.baseUrl}/audit` unchanged.
- **Required producer config change** (all five): set `HIST_BASE_URL` / `hist.base-url` to include
  `/hist` (dev `http://localhost:8083/hist`; via REG `lb://hist-service/hist`). Configuration only — no
  producer code or contract change.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL serve producers at `/hist/audit` and readers at `/hist/patients/{id}/history` and
  `/hist/audit`.
- WHEN a producer's `hist.base-url` omits `/hist`, THEN its `POST {hist.baseUrl}/audit` SHALL `404` — so
  the config value MUST include `/hist`.
- THE SYSTEM SHALL call no downstream service on the audit path (only PostgreSQL).
