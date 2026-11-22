# HIST — Hub Integration

> Service: `hist-service` · Module **HIST** · No TechLab AI (`ai.hasAi = false`). No message broker
> (`stack.messaging.enabled = false`). All coupling is synchronous REST.

HIST is itself the **audit hub** for the platform. Its only hub dependencies are the identity provider
(ACS) and the centralized migration runner (MIG). There is **no** TechLab AI dependency, so there is no
`techlab-ai-integration.md` for this service.

## 1. ACS — identity provider

| Concern | Detail |
|---|---|
| Reader auth | Resource-server JWT validated via ACS **JWKS** (`ACS_JWKS_URI`), caregiver + operator tokens |
| Writer auth | **Service-client JWT** (one principal per producer service), ACS-issued; `source` derived from this identity |
| Transport | sync REST / JWKS fetch; TLS outside localhost |
| Direction | HIST depends on ACS (inbound tokens); HIST never calls ACS back on the audit path |

- WHEN a reader token is presented, THE SYSTEM SHALL validate it against ACS JWKS and derive tenant +
  authorities from its claims (never from `X-Tenant-Id`).
- WHERE per-caregiver patient-link scoping is needed, THE SYSTEM SHALL apply the same rule as EVNT
  `PatientEventService` (tenant from JWT + caregiver→patient link); the link source (JWT claim vs ACS
  lookup) follows EVNT's established mechanism — see `integration-contracts.md` §3.

## 2. MIG — centralized Flyway

| Concern | Detail |
|---|---|
| Role | `neuroassist-niv-migrations` applies HIST's Flyway scripts (block `V0060`–`V0069`) |
| Scope | `tenant` scripts to every `t_<tenantId>`; `global` scripts to `neuroassist_global` |
| HIST behaviour | HIST does **not** run Flyway at service start (A5) |
| New tenant | onboarding provisions the tenant audit tables via the same centralized path |

## 3. Producers (inbound audit writers)

ACS, PAT, EDGE, EVNT, GEST call `POST /hist/audit` (service-client). The full contract (envelope,
reconciliation, failure policy) is in `event-contracts.md` and `integration-contracts.md`. HIST never
calls producers back — it is a pure sink + read model.

## 4. DASH (inbound history reader)

DASH (and the caregiver dashboard via DASH) call `GET /hist/patients/{patientId}/history`. HIST is the
**source of truth** for history (it does not proxy EVNT). Cross-patient aggregation stays in DASH; the
host/consumer embedding direction (DASH embeds HIST widgets) is a FE boundary tracked in the HIST FE
vision and does not change this BE contract.
