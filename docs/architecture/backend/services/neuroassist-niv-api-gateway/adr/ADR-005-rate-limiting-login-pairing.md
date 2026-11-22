<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — Rate limiting for login and pairing (in-memory, per-instance, MVP)

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
The two anonymous, credential-facing endpoints are abuse targets: `POST /acs/auth/login`
(credential stuffing / brute force) and the EDGE pairing-claim endpoint (pairing-code guessing;
the code is a bearer secret with real leak risk — EDGE ADR-003 Risk R2). Rate limiting belongs
at the edge, before the request reaches a backend. The usual distributed limiter is Redis-backed,
but the project's messaging/cache stack is **disabled** (`stack.messaging.enabled = false`, no
Redis provisioned); adding Redis purely for rate limiting would be infrastructure the MVP does
not otherwise need.

## Decisão
For the MVP, GWY applies an **in-memory, per-instance** rate limiter (token-bucket) on
`POST /acs/auth/login` and the EDGE pairing-claim endpoint, returning **`429 Too Many Requests`**
past the threshold. Limits are keyed by client IP (and, where available, username/pairing-code
prefix) and are **configuration** (requests per window — Gap G4), not hard-coded. No Redis / no
distributed counter in the MVP. Other routes are not rate-limited at the edge in this phase.
When horizontal scale or a measured abuse signal arrives, a **distributed** limiter (Redis) is a
revisable follow-up — the *mechanism* changes, the *endpoints* do not.

## Consequências
- Positive: the two highest-risk anonymous endpoints get immediate throttling with **zero new
  infrastructure**, consistent with the disabled messaging/cache stack.
- Positive: thresholds are tunable per environment without a code change.
- Negative / trade-off: per-instance counters are **bypassable by fanning out across gateway
  instances** and reset on restart — weaker than a shared counter (Risk R7). Accepted for the
  MVP's single/few-instance topology (Assumption A4); the revisit trigger is explicit.
- Negative / trade-off: IP-based keying can over-throttle shared NAT/clinic egress; mitigated by
  tuning and by secondary keys (username / code prefix) in specs.
