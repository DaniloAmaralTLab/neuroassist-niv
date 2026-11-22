# SPEC-09 — Messaging Architecture

## Objetivo
Registrar que o registry **não participa de nenhum barramento de mensagens**.

## Status
**Not Applicable (recorded).** See `contracts/event-contracts.md` and
`events/event-catalog.md`. Messaging is disabled platform-wide
(`stack.messaging.enabled = false`); independently of that, REG neither produces
nor consumes events.

## Escopo
**In:** a decisão explícita de zero participação em mensageria; toda relação de REG
com outros módulos é registro + discovery sobre HTTP.
**Out:** tópicos, consumidores, produtores, janelas de idempotência de evento —
nenhum existe.

## Decisões técnicas
- Doc 04 §"Async vs Sync": REG não toca broker; só timers internos de lease/eviction
  (schedules do servidor, não messaging de aplicação).
- `_brief.md` §7-8: relação com cada módulo é registro/discovery, não evento; sem
  domain-anchor event.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL NOT produce any event to a broker.`
`THE SYSTEM SHALL NOT consume any event from a broker.`
`THE SYSTEM SHALL relate to every other module exclusively through registration and discovery over HTTP.`
