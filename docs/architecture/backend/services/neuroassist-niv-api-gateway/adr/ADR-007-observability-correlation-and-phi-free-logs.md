<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-007 — Correlation-id propagation and PHI-free gateway logs

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
NeuroAssist NIV handles PHI for ALS/MND patients under LGPD. The gateway sees every request
body, query string and token, so its logs are the single most dangerous PHI-leak surface if
logged naively (Risk R4). Separately, end-to-end tracing across the eight services needs a
correlation id, and the ACS contract already specifies that **GWY generates `X-Correlation-Id`
if absent** and that it is echoed on the response and on downstream HIST audit calls
(`../acs-service/contracts/api-contract.md` §0.1).

## Decisão
**Correlation id.** GWY generates an `X-Correlation-Id` when the inbound request lacks one,
**forwards** it to the downstream and **echoes** it on the response (INV-G4). An inbound
correlation id is preserved, not overwritten. The id is also the MDC key for the gateway's own
log lines.

**PHI-free logs.** GWY access logs contain **only**: HTTP method, **route template** (e.g.
`/hist/**`, not the concrete URI with ids/query values), status code, latency and the
correlation id. They **never** contain request/response bodies, query-parameter values, path
variable values that could be identifiers, `Authorization`/token contents, or any header that
could carry PHI (INV-G1). `/actuator/health` is exposed for liveness; actuator endpoints that
could echo config/secrets are not publicly exposed.

## Consequências
- Positive: a single correlation id threads a request across the whole fleet (and HIST audit),
  enabling trace-based debugging without PHI.
- Positive: the gateway's logs are safe to ship to the platform's standard log store under LGPD
  — no patient, gesture or tenant data in any line.
- Negative / trade-off: logging the **route template** instead of the concrete path means a log
  line alone cannot identify which record was touched — intentional; the identifying detail
  lives in the resource server's audited, access-controlled HIST trail, not at the edge.
- Negative / trade-off: developers must resist adding "helpful" body/param logging at the edge;
  enforced by a PHI-free log format and a review rule, and testable (a log-scrub assertion).
