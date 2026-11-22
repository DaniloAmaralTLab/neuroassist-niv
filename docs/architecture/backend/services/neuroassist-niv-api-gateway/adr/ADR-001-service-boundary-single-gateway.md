<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — GWY service boundary: single gateway-only service

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
The NeuroAssist NIV fleet needs one controlled ingress in front of eight business services
discovered via Eureka. The gateway could grow into a BFF (request aggregation, body
transformation, caching, per-screen composition) or stay a thin reverse proxy. A sensitive,
LGPD/PHI product benefits from a small, auditable edge whose behavior is declarative config
rather than code, and whose failure modes are few. The resource servers already own domain
logic, persistence, RBAC and audit.

## Decisão
GWY is a **single, standalone Spring Cloud Gateway process**, gateway-only: a route table
(path predicate → `lb://<service>`), a global filter chain and security/CORS/rate-limit/
resilience config — and nothing else. No business endpoint, no domain, no database, no
request aggregation or body transformation. It fronts **only** the eight business services
(ACS, PAT, HIST, EDGE, CONV, EVNT, GEST, TRN); it does **not** front REG, MIG (infrastructure)
or DASH (no backend). Any BFF/composition need is deferred and would be a new, explicit
decision, not grafted onto this service.

## Consequências
- Positive: minimal, auditable surface; the gateway is config-driven and easy to reason about
  and test; clear separation from the resource servers that own authorization and domain.
- Positive: no domain or schema means the shared hexagonal and multi-tenancy ADRs apply only
  nominally — nothing to layer, nothing to migrate.
- Negative / trade-off: cross-service aggregation (one call fanning out to several services)
  is not available at the edge; clients orchestrate multiple calls, or a future BFF is added
  deliberately. Accepted — keeping the edge thin is worth more than early convenience.
