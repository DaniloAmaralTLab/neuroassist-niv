<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — CORS policy for the caregiver web shell

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
The caregiver web shell is a browser SPA (Angular, `frontend/`) served from its own origin and
calling the gateway cross-origin with credentials (the `Authorization` bearer and
`X-Correlation-Id`). CORS must be centralized at the single ingress rather than duplicated
across eight resource servers. A wildcard origin (`*`) combined with credentialed requests is
both forbidden by the CORS spec and a security hole (any site could call the API as the user).

## Decisão
GWY owns the **global CORS policy** for the fleet: an **explicit allow-list of caregiver-shell
origin(s)** per environment (dev / pilot / prod), never `*` when credentials are allowed.
Allowed methods are limited to those the API uses (`GET`, `POST`, `DELETE`, `OPTIONS`); allowed
headers include `Authorization` and `X-Correlation-Id`; `X-Correlation-Id` is added to exposed
response headers; `allowCredentials = true` is paired only with the concrete origin list.
Preflight (`OPTIONS`) is answered at the edge. The exact origin strings are configuration, not
code (Assumption A3).

## Consequências
- Positive: one place to reason about browser access; no per-service CORS drift; the
  wildcard-with-credentials foot-gun is structurally prevented (Risk R6).
- Positive: non-browser clients (patient app, edge station) are unaffected — CORS is a browser
  concern and does not gate them.
- Negative / trade-off: every new caregiver-shell origin (a new environment or domain) requires
  a config change; accepted as the cost of an explicit, non-wildcard policy. Mis-set origins
  surface immediately as blocked browser calls, which is the safe failure direction.
