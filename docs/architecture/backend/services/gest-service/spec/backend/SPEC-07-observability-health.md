# SPEC-07 — Observability & Health

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
Specify health, metrics, logging and correlation for a thin advisory service — including the
**safety-relevant** fact that GEST is **not** a station-liveness signal.

## Escopo
- **In:** Actuator health/readiness, correlation propagation, audit coverage, key metrics.
- **Out:** station liveness / heartbeat (EDGE owns it — see SPEC-10 §SAFETY; do not duplicate),
  detection telemetry (deferred, local ADR-004).

## Decisões técnicas
- Spring Boot Actuator: `/actuator/health` (liveness/readiness), `/actuator/info`.
- Readiness depends on DB (global schema) and ACS JWKS reachability; PAT/HIST are **not** readiness
  gates (needed only at write time).

## Implementação
- `X-Correlation-Id` is extracted (or generated upstream by GWY), bound to the logging MDC, echoed on
  responses and on every HIST audit call.
- Metrics: declare/retire counts, support-check request rate + `304` cache-hit ratio, PAT-validation
  failures, HIST-audit failures.
- Logs **never** contain PII, video, or landmarks (there is none in GEST's domain).

## Casos de borda
- PAT or HIST down does not fail readiness (reads keep serving); only declares fail closed.
- A station that is backgrounded/asleep produces **no** GEST signal — GEST cannot and must not infer
  station liveness (see SPEC-10 §SAFETY).

## Critérios de aceite (EARS)
- THE SYSTEM SHALL expose `/actuator/health` reporting DB and ACS-JWKS reachability.
- THE SYSTEM SHALL bind and echo `X-Correlation-Id` on every response and downstream audit call.
- THE SYSTEM SHALL NOT expose any station-liveness or heartbeat endpoint (reuse EDGE heartbeat;
  SPEC-10 §SAFETY).
