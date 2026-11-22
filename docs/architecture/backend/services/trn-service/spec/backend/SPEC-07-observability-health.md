# SPEC-07 — Observability and Health

> Correlation, health, metrics, logging. EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Make TRN operable: a public health endpoint, end-to-end correlation, metrics for the durable-retry
pipeline, and privacy-safe logging.

## Scope

**In:** `GET /trn/health`, `X-Correlation-Id` propagation, metrics, log hygiene. **Out:** the HIST audit
ledger (that is compliance audit, not operational telemetry — SPEC-10/event-contracts).

## Technical decisions

- `GET /trn/health` is the **only** anonymous endpoint (D-642, `public_paths`). `X-Correlation-Id` is
  propagated end-to-end and echoed on every CONV/PAT/HIST call.
- Logs and metrics carry **no** patient name, PHI, raw LLM content or voice data (ADR-004/ADR-005).

## Implementation

- Spring Boot Actuator `health` exposed at `/trn/health` (liveness/readiness), `permitAll`.
- A `CorrelationIdInterceptor` reads/generates `X-Correlation-Id`, puts it in MDC, and forwards it.
- Metrics: `outbound_job` queue depth, attempts, failures by `job_type`
  (`synthesize|index|publish|retire|erase_conv_audio|audit`); vendor call latency/error counters per
  port; dual-auth completion counter.

## Edge cases

- Health must not disclose tenant/vendor status detail in its body.
- A vendor outage surfaces as job-failure metrics + `last_error`, never as a patient-path failure.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL expose `GET /trn/health` without authentication and SHALL return `200 {"status":"UP"}` when ready, disclosing no tenant/vendor detail (D-642).
- THE SYSTEM SHALL echo the received `X-Correlation-Id` on every response and propagate it to every CONV/PAT/HIST call; WHERE absent, THE SYSTEM SHALL generate one.
- THE SYSTEM SHALL expose metrics for `outbound_job` depth/attempts/failures by `job_type` and per-port vendor latency/errors.
- THE SYSTEM SHALL NOT write patient name, PHI, raw LLM content or voice data to logs or metrics (ADR-004/ADR-005, INV-TRN-7).
