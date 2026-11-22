# SPEC-09 — Messaging Architecture

## Status
**Not Applicable (recorded).** See `contracts/event-contracts.md` and
`events/event-catalog.md`.

## Objective
Record that GWY participates in **no message broker**.

## Scope
**In:** the explicit decision of zero messaging participation; every relation of GWY
to other modules is synchronous HTTP forwarding.
**Out:** topics, consumers, producers, event idempotency windows — none exist.

## Technical decisions
- Messaging is disabled platform-wide (`stack.messaging.enabled = false`); no broker
  is provisioned.
- Independently of that, GWY owns no domain event (doc 04 §"Async vs Sync",
  `_brief.md` §7-8, `03-initial-domain-framing.md` §Domain Events). Its internal
  non-blocking reactive runtime is an implementation detail, not application
  messaging.

## Acceptance criteria (EARS)
`THE SYSTEM SHALL NOT produce any event to a broker.`
`THE SYSTEM SHALL NOT consume any event from a broker.`
`THE SYSTEM SHALL relate to every other module exclusively through synchronous HTTP forwarding.`
