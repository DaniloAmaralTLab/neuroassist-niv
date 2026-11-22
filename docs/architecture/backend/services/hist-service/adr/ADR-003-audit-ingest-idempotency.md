<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Audit ingest idempotency (DECISION c)

## Status
aceita

> Orchestrator default 2026-11-20 (technical, not escalated; revisable by the owner): recommended hybrid composite key (source, subjectType, subjectId, action, occurredAt) + explicit idempotencyKey when present.

## Contexto
Producers **do not retry audit across requests** (no outbox), but a single request retry —
a client/proxy timeout where HIST actually committed, or an at-least-once gateway hop — can
**double-write** the same action. GEST already specifies a HIST-side upsert key
`(source, subjectType, subjectId, eventType, occurredAt)`; ACS/PAT/EDGE/EVNT describe
app-level "no second audit" dedup per fact but leave the HIST-side key unspecified. The
question — **surfaced for the user** — is what idempotency key HIST adopts uniformly:

- **Option A — producer-supplied explicit idempotency key.** Require every producer to send
  an `idempotencyKey`; HIST upserts on it. Cleanest, but changes four producer contracts.
- **Option B — HIST-derived composite key** `(source, subjectType, subjectId, action,
  occurredAt)` (the GEST shape, generalized). No producer change; relies on `occurredAt`
  precision and stable subject ids.
- **Option C — hybrid:** use a producer `idempotencyKey` when present, else fall back to the
  composite (B). Backward-compatible, forward-friendly.

## Decisão
**Recommendation: Option C (hybrid).** Adopt the generalized composite key as the default
(no producer contract change, matches GEST today) and honor an explicit `idempotencyKey`
when a producer supplies one (ACS's access-ending retry path in particular benefits from an
explicit key). Enforce with a UNIQUE constraint; on conflict return the existing record
(`200`) rather than erroring. **User decision required** on whether to additionally mandate
an explicit `idempotencyKey` across producers (Option A) for the strongest guarantee.

## Consequências
- Positive: a retry is a safe no-op; the trail stays duplicate-free (INV-HIST-3).
- Positive (C): zero immediate producer-contract churn; GEST already conforms.
- Negative: composite-key correctness depends on `occurredAt` resolution and subject-id
  stability; two genuinely distinct actions with identical tuples (rare) would collide —
  mitigated by sub-second `occurredAt` and, where needed, an explicit key.
- Open: whether to standardize an explicit `idempotencyKey` field in a future envelope
  revision (specs/backlog).
