# SPEC-07 — Observability and health

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Specify health checks, metrics, structured logging and correlation so ACS is operable and
every access decision is traceable.

## Escopo

- **In:** Spring Boot Actuator health/readiness, correlation-id propagation, structured
  audit logging, authentication/authorization metrics.
- **Out:** centralized log aggregation infra (platform concern), broker metrics (none).

## Decisões técnicas

- `X-Correlation-Id` propagated end-to-end and stamped on every HIST audit call
  (api-contract §0.1, event-contracts §1.1).
- Audit trail of domain actions is the system of record for access decisions (HIST), not
  application logs.

## Implementação

- Actuator: `/actuator/health` (liveness), `/actuator/health/readiness` (checks DB + REG +
  HIST reachability), `/actuator/info`.
- Metrics (Micrometer): `acs.auth.success`, `acs.auth.failure`,
  `acs.session.provisioned`, `acs.session.revoked`, `acs.authz.denied` (403 counter).
- Logs: JSON, include `correlationId`, `tenantId`, `actorType`, `action`; never log
  credentials or raw tokens.

## Casos de borda

- HIST unreachable → readiness `DOWN` for grant paths, but revocation path stays available
  (SEC-001); `acs.audit.enqueued` metric increments for deferred access-ending audits.
- Missing inbound `X-Correlation-Id` → GWY generates one; ACS never drops it.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL expose liveness and readiness via Actuator; readiness SHALL check database and REG reachability.
- THE SYSTEM SHALL include `correlationId`, `tenantId` and `actorType` in every structured log line for a request.
- THE SYSTEM SHALL NOT log credentials, password hashes or raw JWTs.
- WHEN an authorization check denies a request, THE SYSTEM SHALL increment `acs.authz.denied`.
- WHEN a session is provisioned or revoked, THE SYSTEM SHALL increment the corresponding metric.
