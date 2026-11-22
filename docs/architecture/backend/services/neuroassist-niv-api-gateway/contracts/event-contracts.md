# GWY — Event Contracts

> **Not Applicable — messaging is disabled platform-wide; GWY publishes and
> consumes nothing (recorded decision).**
>
> The project has `stack.messaging.enabled = false` (no broker in NeuroAssist NIV).
> Independently of that, GWY is infrastructure that owns no domain event (doc 04
> §"Async vs Sync", `_brief.md` §7-8, `03-initial-domain-framing.md` §Domain
> Events). Its relationship to every other module (ACS, PAT, HIST, EDGE, CONV,
> EVNT, GEST, TRN) is **synchronous HTTP forwarding** only, never events.
>
> This file is intentionally empty of event definitions so the backlog/scaffold do
> not wire a producer/consumer into the gateway.

## Events published

None.

## Events consumed

None.

## Idempotency / versioning

Not applicable — there are no events and no broker. The gateway's only idempotency
concern is request-level and operational: generate-if-absent correlation id and
idempotent-only retry (never re-issuing a `POST` login, pairing claim or event
report). That is covered in `spec/backend/SPEC-05-idempotency-concurrency.md`, not
here.

## Invariants

`THE SYSTEM SHALL NOT produce any event to a broker.`
`THE SYSTEM SHALL NOT consume any event from a broker.`
`THE SYSTEM SHALL relate to every other module exclusively through synchronous HTTP forwarding.`
