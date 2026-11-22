# SPEC-05 — Idempotency and Concurrency

## Objective
Specify the gateway's request-level idempotency and its stateless concurrency
posture: correlation-id handling that never duplicates, retry-safety that never
re-issues a side effect, and rate-limit buckets that are safe under concurrent load.

## Scope
**In:** correlation-id generate-if-absent / preserve semantics; idempotent-only
retry (never double a `POST`); thread-safe in-memory rate-limit buckets; the
stateless-per-request model.
**Out:** event idempotency windows (no events — SPEC-09); database transactions (no
schema — SPEC-04).

## Technical decisions
- GWY holds **no per-request state between calls** (stateless reactive proxy, doc
  03 §Aggregates). Concurrency safety is therefore limited to the shared in-memory
  structures: JWKS cache, rate-limit buckets, breaker state.
- **Correlation id is idempotent:** generate exactly one if absent; never overwrite
  an inbound one (INV-G4). A retried request keeps the same correlation id.
- **Retry is idempotent-only** (ADR-006): a `GET` may be retried; a `POST` login,
  pairing claim or event report is **never** auto-retried — the gateway must not
  turn a single user action into two side effects (Risk R8).
- Rate-limit token buckets are **per-instance, in-memory** (ADR-005) and must be
  updated atomically under concurrent requests.

## Implementation
- `CorrelationIdFilter`: `exchange.getRequest().getHeaders().getFirst("X-Correlation-Id")`;
  generate a UUID only when absent; set as MDC key and response header.
- Retry filter scoped to `methods: GET`.
- Rate-limit buckets use a concurrency-safe structure (atomic token-bucket per key).
- No shared mutable per-request state — each exchange is independent.

## Edge cases
- Two concurrent requests without a correlation id → each gets its **own** distinct
  id (not a shared one).
- A client retries a failed `POST /acs/auth/login` itself → the gateway does **not**
  add a second automatic retry (no triple-login).
- Concurrent logins from the same IP hitting the bucket boundary → the bucket
  decrements atomically; exactly the over-threshold requests get `429`.
- JWKS refresh racing with verification → verification uses the last-good key set;
  a refresh does not drop in-flight requests.

## Acceptance criteria (EARS)
`WHEN a request lacks X-Correlation-Id, THE SYSTEM SHALL generate exactly one and SHALL NOT share it with any other concurrent request.`
`WHEN a request carries an X-Correlation-Id, THE SYSTEM SHALL preserve it across any internal retry.` (INV-G4)
`THE SYSTEM SHALL auto-retry only idempotent verbs and SHALL NEVER auto-retry a login, pairing, or event-report POST.` (Risk R8)
`WHILE concurrent requests hit a rate-limit bucket, THE SYSTEM SHALL decrement it atomically so that exactly the over-threshold requests receive 429.`
`THE SYSTEM SHALL hold no per-request state between calls (stateless reactive proxy).`
