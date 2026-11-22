# SPEC-07 — Observability & Health

> EARS guide: `../../../../standards/ears-notation.md`.

## Objective
Expose health/readiness and correlation/metrics without ever coupling the station read path to a
downstream dependency.

## Scope
- **In:** `GET /conv/health`; `X-Correlation-Id` propagation; structured logging; publish/retire/erase
  and audit-retry metrics.
- **Out:** patient-speech content logging (never — ADR-006); live playback tracing (client-side).

## Implementation
- Spring Boot Actuator health: datastore + blob storage are hard dependencies; **ACS/PAT/HIST
  reachability is a readiness detail**, never a hard failure of the station path (INV-CONV-5).
- `CorrelationIdInterceptor` echoes `X-Correlation-Id` on responses and on every HIST call.
- Metrics: publish count, audit hard-502 failures (rollbacks), durable-retry queue depth/age for
  withdraw/erase, usage-signal accept/discard counts.
- Logs never contain phrase free text or `voice_model_ref` (privacy, ADR-006/005).

## Edge cases
- HIST down during publish → metric increment + `502`; during retire/erase → committed, queued, retry
  metric.
- Blob storage down → `/conv/audio` fails but the station still plays from its own cache (INV-CONV-5).

## Acceptance criteria (EARS)
- THE SYSTEM SHALL respond `200 {"status":"UP"}` on `GET /conv/health` when datastore and blob storage are up, and `503` when a hard dependency is down.
- THE SYSTEM SHALL treat ACS/PAT/HIST unreachability as a readiness detail, never a hard health failure of the station path (INV-CONV-5).
- THE SYSTEM SHALL echo `X-Correlation-Id` on every response and downstream HIST call.
- THE SYSTEM SHALL never log phrase free text or voice-model references (ADR-005/006).
