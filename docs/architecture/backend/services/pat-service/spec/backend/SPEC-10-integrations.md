# SPEC-10 — Integrations

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical contract: `../../contracts/integration-contracts.md`.

## Objetivo

Specify PAT's intra-project synchronous integrations — the two outbound calls (ACS, HIST) and
the inbound read contracts PAT publishes to downstream modules — and the resilience posture.

## Escopo

- **In:** PAT → ACS (JWKS/introspect), PAT → HIST (audit), PAT → MIG (authored Flyway),
  downstream pull reads (GEST/EDGE/EVNT/DASH/CONV), fallback/circuit-breaker posture.
- **Out:** external third-party systems (none in MVP — internal-network only); TechLab AI hub
  (`ai.hasAi = false`, hub-integration.md).

## Decisões técnicas

- PAT is a pure ACS resource server (A1); no token issuance.
- Discovery via REG (Eureka); direct `*.base-url` properties as fallback.
- Downstream modules **pull** (ADR-004); PAT never pushes. Detection reads use a service-client
  identity carrying `pat.command.read` — never the patient-session token (INV-PAT-7, ACS INV-3).

## Implementação

Outbound (detail: integration-contracts §1–3):

| Peer | Call | Auth | Fallback |
|---|---|---|---|
| ACS | `GET /acs/.well-known/jwks.json` | public | cached key set |
| ACS | `POST /acs/auth/introspect` | service client | best-effort revocation on reads; enforced on writes |
| HIST | `POST {hist.baseUrl}/audit` (base URL incl. `/hist`, D-640) | service client, `hist.audit.record` | hard-502 → `502 audit-unavailable` (prod); `PatientDeactivated` → commit + durable retry (ADR-005); log-only (dev) |
| MIG | authored Flyway `V0020+` | build/ops | n/a (not a runtime call) |

Inbound (detail: integration-contracts §4): GEST/EDGE catalog pull, EVNT command-by-id, DASH
patients+commands, CONV patient-by-id — all via the `api-contract.md` read endpoints.

## Casos de borda

- ACS JWKS unreachable → cached keys; never fail open to unsigned tokens.
- ACS introspect unreachable → standard validation still applies; revocation best-effort + logged.
- REG unreachable → direct `*.base-url` URLs.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL validate every inbound JWT against ACS JWKS and SHALL NOT accept unsigned tokens even when JWKS is unreachable.
- WHERE a state-changing operation runs, THE SYSTEM SHALL honor ACS revocation via introspection.
- WHEN a downstream module reads a catalog, THE SYSTEM SHALL require a `pat.command.read` service-client or caregiver authority and SHALL reject a patient-session token `403` (INV-PAT-7).
- IF REG is unreachable, THEN THE SYSTEM SHALL resolve peers via the configured `*.base-url` properties.
