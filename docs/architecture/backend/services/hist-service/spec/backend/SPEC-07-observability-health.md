# SPEC-07 — Observability + Health

> `correlationId` is the cross-service spine (doc 02). HIST is the de-facto audit log of the platform.

## Objective

Define correlation propagation, health/readiness, and the metrics that make the blast-radius SLO
observable.

## Scope

- **In** — `X-Correlation-Id` propagation, structured logging, actuator health/readiness, key metrics.
- **Out** — centralized dashboards (operator tooling), long-term log retention.

## Decisions

- Every audit record stores `correlation_id`; every request/response echoes `X-Correlation-Id`
  (generated if still absent at HIST).
- Readiness depends on PostgreSQL connectivity (HIST must not accept writes it cannot persist).

## Implementation

- `/actuator/health` (liveness) and `/actuator/health/readiness` (DB check).
- Metrics (Micrometer): `hist.audit.appended{source,action,flagged}` counter;
  `hist.audit.replay` counter; `hist.audit.latency` timer; `hist.history.query.latency` timer;
  `hist.audit.rejected{reason}` counter.
- Structured logs carry `correlationId`, `source`, `action`, `tenantId` (never payload PII).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL store `correlation_id` on every record and echo `X-Correlation-Id` on every response.
- WHEN `X-Correlation-Id` is absent at HIST, THE SYSTEM SHALL generate one and echo it.
- WHILE PostgreSQL is unreachable, THE SYSTEM SHALL report readiness `DOWN`.
- THE SYSTEM SHALL emit an append counter tagged by `source`, `action`, and `flagged`.
- THE SYSTEM SHALL never log personal payload fields (LGPD, ADR-006).
