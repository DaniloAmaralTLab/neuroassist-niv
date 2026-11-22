<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposicoes a Validar
- Dependencias Criticas
-->

# 06 — Risks, Gaps, Assumptions

> Service: `neuroassist-niv-api-gateway` · Module **GWY (Spring Cloud Gateway)** · Infrastructure.

## Riscos

- **R1 — Single trusted issuer by mistake.** If the scaffold wires only the ACS JWKS, every
  `edge.device`-token request is rejected at the edge (EDGE signs with its own key). Mitigate:
  the edge check MUST trust **both** ACS and EDGE JWKS (ADR-002, INV-G6). Covered by a spec
  test asserting an EDGE-signed token is admitted.
- **R2 — Non-expiring token rejected.** A naive expiry check rejects patient-session tokens
  (no `exp` by design — ACS §4.1). Mitigate: treat an absent `exp` as valid for the edge check
  (ADR-002); test with an `exp`-less token.
- **R3 — Edge check mistaken for terminal auth.** Treating the coarse gateway check as the
  authorization boundary would let a revoked (`jti`-blacklisted) or under-privileged token
  through, since the gateway does not call introspect per request. Mitigate: resource servers
  re-validate + enforce RBAC + blacklist (INV-G5); the edge check is advisory only.
- **R4 — PHI leakage into logs.** Default access-log patterns can capture query strings and
  bodies (patient/gesture data, PHI/LGPD). Mitigate: PHI-free log format — method, path
  template, status, latency, correlation id only (ADR-007, INV-G1).
- **R5 — Tenant-header spoof.** A client sending `X-Tenant-Id` could cross tenants if a
  downstream trusted it. Mitigate: strip at the edge (ADR-003, INV-G3); downstreams derive
  tenant from the claim and ignore the header anyway (ACS contract §0.1).
- **R6 — CORS misconfiguration.** A wildcard origin combined with credentials would expose the
  caregiver shell to any site. Mitigate: explicit origin allow-list, no `*`-with-credentials
  (ADR-004).
- **R7 — Per-instance rate limiting under-protects.** In-memory limits are bypassable by
  fanning out across instances. Accepted for the MVP (single/few instances, ADR-005); revisit
  with distributed (Redis) limits when horizontal scale or an abuse signal appears.
- **R8 — Retry on a non-idempotent verb.** A blanket retry policy could double-issue a login,
  pairing claim or event report. Mitigate: retry only idempotent verbs, never `POST`/`PATCH`
  (ADR-006).

## Gaps Conhecidos

- **G1 — EDGE revocation mechanism not final.** EDGE ADR-002 leaves the immediate-revoke
  mechanism open (short-TTL+heartbeat vs introspection). It is honored **downstream**, not at
  the gateway, so GWY is unaffected for now — but the choice may later add an optional
  introspection hop for sensitive routes. Tracked against EDGE specs (Gap G1 there).
- ~~**G2 — TRN route is proposed, not verified.**~~ **CLOSED.** `trn-service` `server.port=8089`
  confirmed against `backend/services/trn-service/src/main/resources/application.yml`.
  Route R8 `/trn/**` → `lb://trn-service:8089` is now authoritative.
- ~~**G3 — Anonymous allow-list exact paths.**~~ **CLOSED.** EDGE exact paths confirmed against
  `edge-service/contracts/api-contract.md`: `POST /edge/devices/pair` (code-authenticated via
  `X-Pairing-Code`, public, rate-limited), `GET /edge/.well-known/jwks.json` (public),
  `GET /edge/health` (public). Allow-list is now authoritative.
- **G4 — Rate-limit thresholds unquantified.** The *values* (requests/window) for login and
  pairing are a specs decision; ADR-005 fixes the *mechanism* (in-memory per-instance), not
  the numbers.

## Suposicoes a Validar

- **A1 — No prefix stripping.** Controllers serve under their module base path (ACS serves
  `/acs/**`, per `../acs-service/contracts/api-contract.md` §0), so the gateway forwards the
  full path with no `StripPrefix`. Validate against each service's base path in specs.
- **A2 — JWKS reachable by logical name or config URI.** The gateway reaches ACS/EDGE JWKS at
  startup/refresh; assume a stable URI (via `lb://` or configured host). Validate the JWKS
  refresh/caching behavior for key rotation.
- **A3 — Caregiver-shell origin known.** The CORS origin(s) for the Angular dashboard are
  configurable per environment; assume a non-wildcard origin list is available at deploy.
- **A4 — Single/few gateway instances in MVP.** Underpins the in-memory rate-limit choice
  (ADR-005); validate against the target deployment topology.

## Dependencias Criticas

- **REG — Eureka** (`../neuroassist-niv-service-registry/`, `:8761`): without a live registry,
  `lb://` resolution degrades and routing fails. GWY is a Eureka **client**.
- **ACS JWKS** (`/acs/.well-known/jwks.json`) and **EDGE JWKS** (`/edge/.well-known/jwks.json`):
  required for the edge signature check (two issuers — ADR-002).
- **The eight business services** (ACS 8081, PAT 8082, HIST 8083, EDGE 8084, CONV 8085,
  EVNT 8086, GEST 8088, TRN 8089-proposed): the proxied downstreams, discovered by logical name.
- **MIG** — not a runtime dependency of GWY, but the single owner of schema; GWY adds no
  migration (dependency recorded for completeness).
