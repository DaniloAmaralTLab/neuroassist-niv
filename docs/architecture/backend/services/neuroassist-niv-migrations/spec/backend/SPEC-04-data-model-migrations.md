# SPEC-04 — Data Model and Migrations

## Objetivo
Especificar o único dado que MIG possui (`migration_range_registry`), o baseline block
`V0001–V0009`, e a tabela autoritativa de blocos reservados (fecha PAT **G1**).

## Escopo
**In:** DDL canônica do baseline (extensões, `neuroassist_global`,
`uuid_generate_v7()`, `migration_range_registry`, tenant template); o registro
autoritativo dos blocos; o layout do `flyway_schema_history`.
**Out:** qualquer tabela de negócio/PHI (cada módulo autora a sua); undo/rollback
(SPEC-05, ADR-005).

## Decisões técnicas
- DDL canônica completa em `contracts/data-model.md` (blocos ` ```sql ` executáveis,
  consumidos por `be-migration-generator.py`).
- **G5 resolvido:** `uuid_generate_v7()` é **definida** no baseline (V0002) — não
  existe função nativa Postgres com esse nome.
- **G1 fechado:** `migration_range_registry` é a fonte única e verificável dos blocos;
  EVNT/GEST/HIST entram como `confirmed = FALSE` (propostos, não numerados em disco).
- Routing por anotação `-- schema: global|tenant` (`persistence.arch.json`).

## Baseline block `V0001–V0009` (MIG, ADR-004)
| Script | Schema | Conteúdo |
|---|---|---|
| `V0001` | global | extensions + `neuroassist_global` |
| `V0002` | global | `uuid_generate_v7()` (G5) |
| `V0003` | global | `migration_range_registry` |
| `V0004` | global | seed do registro de blocos |
| `V0005` | tenant | tenant-template baseline |
| `V0006–V0009` | — | reservado p/ housekeeping futuro (livre) |

## Reserved-block registry (autoritativo; seeded no baseline)
Ver `contracts/data-model.md` §2.2 e `05-persistence-model.md`. MIG `V0001–V0009`;
ACS `V0010–V0012`; PAT `V0020–V0022`; EDGE `V0030–V0032(+)`; EVNT `V0040–V0049`
*(proposto)*; GEST `V0050–V0059` *(proposto)*; HIST `V0060–V0069` *(proposto)*; CONV
`V0070–V0079`; TRN `V0080–V0089` *(proposto)*. DASH e REG não possuem migrações.

## Casos de borda
- Função `uuid_generate_v7()` depende de `pgcrypto` → V0002 depois de V0001.
- Seed idempotente (`ON CONFLICT DO NOTHING`); reatribuição de bloco é uma nova
  migração forward, nunca edição in-place (SPEC-05).
- Overlap de blocos → falha do guard antes de aplicar (INV-MIG-2).

## Critérios de aceite (EARS)
`THE SYSTEM SHALL own exactly one business-adjacent table, migration_range_registry, in neuroassist_global.`
`THE SYSTEM SHALL install required extensions (uuid-ossp, pgcrypto, pg_trgm, unaccent) once in neuroassist_global (INV-MIG-5).`
`THE SYSTEM SHALL define uuid_generate_v7() in the baseline block (resolves G5).`
`THE SYSTEM SHALL seed migration_range_registry with every known block and mark EVNT/GEST/HIST/TRN proposals as confirmed=false (G1).`
`IF two reserved blocks overlap on any version, THEN THE SYSTEM SHALL fail the range-registry guard before applying anything (INV-MIG-2).`
`THE SYSTEM SHALL hold no PHI and no business/tenant domain data of its own.`
`WHEN a tenant schema is migrated, THE SYSTEM SHALL route each DDL block by its -- schema: annotation (global vs tenant).`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
