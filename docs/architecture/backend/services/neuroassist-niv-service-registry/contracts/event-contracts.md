# REG — Event Contracts

> **Not Applicable — messaging is disabled platform-wide; REG publishes and
> consumes nothing (recorded decision).**
>
> The project has `stack.messaging.enabled = false` (no broker in NeuroAssist NIV).
> Independently of that, REG is infrastructure that owns no domain event (doc 04
> §"Async vs Sync", `_brief.md` §7-8, `03-initial-domain-framing.md` §Domain
> Events). Its relationship to every other module (ACS, PAT, EDGE, EVNT, CONV,
> GEST, HIST, TRN, GWY) is **registration + discovery over HTTP only**, never events.
>
> This file is intentionally empty of event definitions so the backlog/scaffold do
> not wire a producer/consumer into the registry.

## Events published

None.

## Events consumed

None.

## Idempotency / versioning

Not applicable — there are no events and no broker. Registration/heartbeat
idempotency at the Eureka protocol level (a repeated registration or renewal must
not create a duplicate lease) is covered in
`spec/backend/SPEC-05-idempotency-concurrency.md`.

## Invariants

`THE SYSTEM SHALL NOT produce any event to a broker.`
`THE SYSTEM SHALL NOT consume any event from a broker.`
`THE SYSTEM SHALL relate to other modules exclusively through registration and discovery over HTTP.`
