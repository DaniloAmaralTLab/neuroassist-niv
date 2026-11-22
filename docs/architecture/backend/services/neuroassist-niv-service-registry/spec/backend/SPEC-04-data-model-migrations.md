# SPEC-04 — Data Model and Migrations

## Objetivo
Registrar que o registry **não possui modelo de dados nem migrações**.

## Status
**Not Applicable (recorded).** See `contracts/data-model.md` and
`05-persistence-model.md`. REG is stateless of business data, owns no PostgreSQL
schema, has no tenant concept, and contributes no Flyway migration to
`neuroassist-niv-migrations` (MIG).

## Escopo
**In:** a decisão explícita de que não há schema; o único estado é o lease registry
**in-memory**, efêmero e reconstruível por re-registro.
**Out:** tudo o mais — não há nada para modelar ou migrar.

## Decisões técnicas
- Sem datastore (doc 04, doc 05); membership vive na memória do servidor Eureka.
- REG não participa do `neuroassist_global` nem de qualquer `t_<tenant>`.
- Nenhum PHI transita ou é persistido por REG (INV-REG-1).

## Critérios de aceite (EARS)
`THE SYSTEM SHALL persist no business or tenant state.`
`THE SYSTEM SHALL hold lease/membership state in memory only.`
`THE SYSTEM SHALL contribute no Flyway migration to the centralized migrations service.`
`WHEN the registry restarts, THE SYSTEM SHALL rebuild membership from client re-registration, not from a datastore.`
