<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Service: `neuroassist-niv-api-gateway` · Module **GWY — API Gateway** · Infrastructure — **no business domain**.

## Ubiquitous Language

GWY has **no business domain** and therefore no ubiquitous *domain* language. Its vocabulary
is operational only:

| Term | Meaning (operational) |
|---|---|
| **Route** | A path predicate (`/acs/**`) bound to a downstream `lb://<service>` target. |
| **Filter** | A stage in the global filter chain (correlation id, tenant-strip, coarse JWT check, access log). |
| **Edge check** | The coarse, stateless JWT validation at ingress (signature / issuer / expiry) against the ACS and EDGE JWKS. |
| **Anonymous allow-list** | The explicit set of paths that bypass the JWT filter (login, both JWKS, pairing, health). |
| **Correlation id** | `X-Correlation-Id` generated-if-absent, forwarded and echoed. |

Domain nouns (patient, caregiver, gesture, command, event, tenant) belong to the business
services and are **never** interpreted by GWY — it forwards them opaquely.

## Aggregates and Entities

**None.** GWY defines no aggregate, entity or value object and persists nothing. Its runtime
state is the in-memory route table and filter config loaded from `application.yml`; it holds
no request state between calls (stateless reactive proxy).

## Domain Events

**None.** `stack.messaging.enabled = false` and GWY owns no domain, so it publishes and
consumes no event. The nearest operational signal is a log line (*request routed* /
*request rejected at edge*) — a log record, not a domain event, and PHI-free (ADR-007).
Business/audit events are owned by the resource servers and HIST.

## State Transitions

**None** at the domain level. The only transition is the per-request filter-chain traversal:

`received → CORS admitted → correlation-stamped → tenant-stripped → (anonymous ? skip : edge-checked) → routed via lb:// → response echoed`

A failed edge check short-circuits to `401`; a tripped circuit breaker short-circuits to the
configured fallback (ADR-006). No persistent state machine exists.

## Invariants

- **INV-G1 — no PHI in logs.** No log line produced by GWY contains a request body, query
  value or token content; only method, path template, status, latency and correlation id.
- **INV-G2 — deny by default.** Every route except the explicit anonymous allow-list requires
  a token that passes the edge check before any `lb://` call.
- **INV-G3 — client tenant never trusted.** Any inbound `X-Tenant-Id` is stripped; GWY
  forwards no tenant header derived from the client.
- **INV-G4 — correlation id always present downstream.** Every proxied request carries an
  `X-Correlation-Id` (generated if the client omitted it) and the response echoes it.
- **INV-G5 — the edge check is never terminal.** A request admitted by GWY is still fully
  re-validated and authorized by the resource server; GWY never substitutes for `@PreAuthorize`
  or the revocation check.
- **INV-G6 — two issuers trusted.** The edge check accepts signatures from **both** the ACS
  and the EDGE JWKS; an `edge.device` token is not rejected for not being ACS-signed.
