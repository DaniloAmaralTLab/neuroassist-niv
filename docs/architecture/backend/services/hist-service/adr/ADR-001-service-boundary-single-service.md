<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — HIST service boundary: single service

## Status
aceita

## Contexto
HIST has two cohesive surfaces over one immutable store: an append-only audit **write**
surface (`POST /audit`, called by ACS, PAT, EDGE, EVNT, GEST) and a patient-scoped history
**read** surface (`GET /history`, consumed by DASH). Both operate on the same `AuditRecord`
aggregate; HIST holds no business state beyond the trail and never calls producers back.
The project direction is a modular monolith (`../../../adr/ADR-002-modular-monolith.md`).
The question is whether to split write and read (CQRS services) or keep one service.

## Decisão
We keep HIST as a **single service** (`hist-service`), one bounded context. Write and read
share the same store and immutability invariant; a read model can be a query (or an
in-process projection) without a separate deployable. Splitting now would add cross-service
coupling for no MVP benefit.

## Consequências
- Positive: one cohesive append-only surface; immutability and idempotency enforced in one
  boundary; simplest unit to operate for the pilot.
- Positive: matches the modular-monolith direction and the other services' single-service
  choices.
- Negative / trade-off: write and read scale together. If DASH read volume later dominates,
  a read-replica or a split read service can be introduced — a reversible, per-service
  decision that touches no other module.
