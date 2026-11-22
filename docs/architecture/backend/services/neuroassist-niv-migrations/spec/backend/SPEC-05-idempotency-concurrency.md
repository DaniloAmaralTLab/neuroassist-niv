# SPEC-05 — Idempotency and Concurrency

## Objetivo
Especificar a política forward-only + checksum, a regra de próxima versão, a
re-execução no-op e a disciplina não-transacional de DDL.

## Escopo
**In:** imutabilidade de scripts aplicados, `validateOnMigrate`, `outOfOrder=false`,
regra `max(global ∪ tenant) + 1`, no-op re-runnable, DDL fora de transação,
`R__` repeatable para reseeds idempotentes.
**Out:** undo/rollback automático (inexistente — ADR-005); concorrência multi-runner
(MVP: um único runner ops-triggered, sequencial, A3/A5).

## Decisões técnicas (ADR-005)
- **Forward-only + imutável.** Script aplicado nunca é editado; correção é uma nova
  versão estritamente maior (`V<next>__…_retire.sql`). `validateOnMigrate=true`
  (checksums on) — um arquivo editado falha o run e nomeia o schema (INV-MIG-3).
- **Sem out-of-order.** `outOfOrder=false`; próxima versão = `max(global ∪ tenant
  histories) + 1` (INV-MIG-4) — nunca o max local de um schema.
- **Re-runnable.** Run contra base já na versão alvo é no-op (exit 0).
- **Não-transacional.** `CREATE/DROP SCHEMA` fora de qualquer `@Transactional` que
  contenha uma chamada Flyway (INV-MIG-6, doc 06 R5).
- **`R__` repeatable** apenas para reseeds idempotentes (ex.: authority rows). Doc 06
  **G4** (política project-wide de reseed versionado vs `R__`) permanece aberta.

## Casos de borda
- Script aplicado sofre "lint/format" → checksum muda → run falha rápido nomeando o
  schema; corrigir **forward**, nunca reverter o arquivo (doc 06 R3).
- Nova versão abaixo do max corrente → rejeitada (out-of-order).
- `--all` repetido sem novas migrações → no-op total, exit 0.
- Dois tenants em versões divergentes após falha parcial → próximo `--all` reconverge.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL treat every committed V*.sql as immutable; a correction ships as a strictly higher new version (INV-MIG-3).`
`THE SYSTEM SHALL run with validateOnMigrate=true and outOfOrder=false.`
`IF an applied script's checksum changed, THEN THE SYSTEM SHALL fail the run fast and name the schema (doc 06 R3).`
`THE SYSTEM SHALL compute the next version as max(global ∪ tenant histories) + 1 (INV-MIG-4).`
`IF a new script's version is lower than the current max, THEN THE SYSTEM SHALL reject it as out-of-order.`
`WHEN a run finds every schema at its target version, THE SYSTEM SHALL make it a no-op and exit 0.`
`THE SYSTEM SHALL execute CREATE/DROP SCHEMA outside any @Transactional scope containing a Flyway call (INV-MIG-6).`
`WHERE a reseed is idempotent, THE SYSTEM SHALL use a repeatable R__ migration rather than a new versioned script.`

## Gaps/Deferidos
- **G4** — regra project-wide de reseed (versionado vs `R__`) e seu efeito no bump de
  `modelo_acesso_versao` — **aberto**.

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
