# SPEC-08 — BDD Test Scenarios

## Objetivo
Narrar os cenários BDD de MIG e os steps reutilizáveis. Os cenários executáveis
(Gherkin puro) vivem em `tests/cucumber/*.feature`; este documento é a prosa de apoio
(refs de SPEC, dados de exemplo, steps compartilhados) — nunca `.feature`.

## Features executáveis
| Arquivo | Cobre | SPEC |
|---|---|---|
| `tests/cucumber/global-and-tenant-migration.feature` | `--all`: global pass + tenant pass, convergência de versão | SPEC-02 |
| `tests/cucumber/tenant-provisioning.feature` | `--provision-tenant` (novo/idempotente) + `--tenant` | SPEC-03 |
| `tests/cucumber/forward-only-and-checksum.feature` | imutabilidade, out-of-order, no-op, exit codes | SPEC-05 / SPEC-07 |
| `tests/cucumber/range-registry-guard.feature` | guard de colisão de bloco reservado | SPEC-04 |

## Ambiente de teste
- **Testcontainers PostgreSQL** (uma instância por classe) com um usuário admin
  (`CREATE SCHEMA`/`EXTENSION`). MIG é exercido chamando `MigrationsJobRunner` com os
  argumentos do modo e asserindo o exit code + estado em `flyway_schema_history` e
  `information_schema.schemata`.
- Scripts de teste: um conjunto mínimo de blocos fake (`V0001`..`V0005` baseline reais
  + um `V0010` global fake e um `V0020` tenant fake) em um location de teste.

## Steps reutilizáveis (implementação Java compartilhada — não listar nos .feature)
- `Given a clean PostgreSQL with an admin datasource`
- `Given tenant schema(s) {list} exist`
- `When MIG runs with "{mode args}"`
- `Then the run exits {0|1|2}`
- `Then neuroassist_global is at version {V}`
- `Then every tenant schema is at version {V}`
- `Then schema "{schema}" is reported FAILED`
- `Then migration_range_registry contains block {from}..{to} for {module}`

## Dados de exemplo
- Tenants: `t_unitA`, `t_unitB`.
- Baseline alvo: `V0005`; com blocos fake de módulo, alvo global `V0010`, tenant `V0020`.
- Checksum drift: reescrever um `V*.sql` já aplicado e reexecutar → exit 2.

## Critérios de aceite (EARS)
`WHEN the BDD suite runs against a Testcontainers PostgreSQL, THE SYSTEM SHALL demonstrate each run mode's exit code and resulting schema versions.`
`THE SYSTEM SHALL prove INV-MIG-1 (convergent versions), INV-MIG-3 (immutability), INV-MIG-4 (next-version), and INV-MIG-6 (non-transactional DDL) via executable scenarios.`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
