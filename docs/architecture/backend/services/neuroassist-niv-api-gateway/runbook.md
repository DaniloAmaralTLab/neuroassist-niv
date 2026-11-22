# Operational Runbook — neuroassist-niv-api-gateway

**Service:** `neuroassist-niv-api-gateway` (Spring Cloud Gateway, reactive / WebFlux)
**Default port:** 8080 (the public edge)
**Architectural references:** ADR-001 (single gateway-only), ADR-002 (two-issuer
edge check), ADR-003 (tenant strip), ADR-004 (CORS), ADR-005 (rate limit), ADR-006
(routing + resilience), ADR-007 (correlation + PHI-free logs)

---

## Critical runtime dependencies

| Dependency | Why | Symptom if down |
|---|---|---|
| REG (Eureka) `:8761` | `lb://` resolution | new targets fail; cached ones keep routing until cache expiry (doc 06) |
| ACS JWKS | edge check issuer 1 (caregiver + patient-session) | ACS-signed tokens fail to verify on cache miss after key rotation |
| EDGE JWKS | edge check issuer 2 (`edge.device`) | **every edge.device request 401s** if the EDGE JWKS was never wired (Risk R1) |

---

## Scenario 1 — A whole issuer's clients are being rejected (401 storm)

Most likely **only one JWKS was wired** (Risk R1). If `edge.device` clients 401 but
caregivers succeed, the EDGE JWKS is missing from the trust fabric.

```bash
# confirm both JWKS URIs are configured
curl -s http://localhost:8080/actuator/configprops | grep -i jwks   # platform-internal only
# verify each issuer is reachable
curl -s http://localhost:8081/acs/.well-known/jwks.json  | head
curl -s http://localhost:8084/edge/.well-known/jwks.json | head
```

Fix: wire **both** `jwk-set-uri` (ACS + EDGE) and a multi-issuer resolver
(SPEC-03). This is the top framework-gap hazard — the generated config ships a
single `issuer-uri`.

---

## Scenario 2 — Patient-session requests all 401 (non-expiring token rejected)

Risk R2: a naive expiry check rejects tokens with **no `exp`** (patient-session
tokens are non-expiring by design, ACS §4.1).

Fix: the JWT validator must **skip** `exp` validation when the claim is absent
(SPEC-03). Prove with an `exp`-less token admitted on a protected route.

---

## Scenario 3 — A downstream is slow or dead

Per-route timeout + circuit breaker (ADR-006).

```bash
# breaker + latency metrics
curl -s http://localhost:8080/actuator/prometheus | grep -E "resilience4j_circuitbreaker_state|gateway"
```

| Signal | Meaning | Action |
|---|---|---|
| Route returns 504 | downstream exceeded response timeout | check the downstream health |
| Route returns 503 | breaker open OR no healthy instance in REG | check REG membership / downstream UP |
| Other routes healthy | breaker isolation working | no fleet-wide action |

Never add a blanket retry — login/pairing/event-report must **never** be auto-retried
(Risk R8).

---

## Scenario 4 — Browser calls blocked by CORS

The caregiver-shell origin is not on the allow-list (ADR-004). This is the **safe**
failure direction.

```bash
curl -s -i -X OPTIONS http://localhost:8080/pat/commands \
  -H "Origin: https://shell.neuroassist.niv" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control
```

Fix: add the environment's origin to `GATEWAY_CORS_ALLOWED_ORIGINS`. Never set `*`
with credentials (Risk R6).

---

## Scenario 5 — Login / pairing being throttled (429)

In-memory per-instance token bucket (ADR-005). Expected under credential-stuffing or
pairing-code guessing; also possible for a shared NAT/clinic egress (over-throttle).

```bash
curl -s http://localhost:8080/actuator/prometheus | grep -i ratelimit
```

| Situation | Action |
|---|---|
| Genuine abuse | leave throttled; investigate the source IP |
| Shared NAT over-throttle | raise `GATEWAY_RATELIMIT_*_CAPACITY` or tune secondary key (username/code prefix) |
| Counters reset on restart | expected — per-instance in-memory (Risk R7); revisit with Redis only at horizontal scale (Assumption A4) |

---

## Scenario 6 — Confirm the edge never leaks PHI

Access logs must contain **only** method, route template, status, latency,
correlation id (INV-G1, ADR-007).

```bash
# a log line must NOT contain a concrete id, query value, body, or token
# expected shape: GET /hist/** 200 12ms corrId=<uuid>
```

If a body/param appears in a log line, a PHI-leak was introduced — revert the
logging change; the PHI-free log-format assertion should have caught it (SPEC-07).

---

## Quick reference — operational endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/actuator/health` | GET | Gateway liveness (anonymous) |
| `/actuator/prometheus` | GET | Metrics: routes, latency, 4xx/5xx, breaker state, rate-limit rejections (platform-internal) |

## Not fronted by GWY

REG (`:8761`), MIG (no web port), DASH (no backend) — GWY declares **no** route to
any of them. Requests to those paths return 404 at the edge.
