# SPEC-09 — Messaging Architecture

## Objetivo
Registrar que MIG **não participa de messaging**.

## Status
**Not Applicable (recorded).** See `contracts/event-contracts.md`,
`events/event-catalog.md`, and `03-initial-domain-framing.md` §Domain Events.

Messaging is disabled platform-wide (`stack.messaging.enabled = false`) and MIG is
infrastructure that owns no domain event. MIG coordinates with every other module
purely through the shared database and `migration_range_registry`, never over a
broker and never at runtime.

## Escopo
**In:** a decisão explícita de que não há producer nem consumer.
**Out:** tudo o mais — não há tópico, fila, payload ou idempotência de evento a
especificar.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL produce no event to any broker.`
`THE SYSTEM SHALL consume no event from any broker.`
`THE SYSTEM SHALL coordinate with other modules only through the shared database and the migration_range_registry.`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
