# GEST-012 -- Flyway migrations V0050__create_engine_version.sql and V0051__create_engine_capability.sql on global schema

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Create the two Flyway migration scripts that establish the GEST global tables in schema
`neuroassist_global`. Scripts are routed to `db/migration/global/` so the centralized MIG module
applies them. `V0050` creates `engine_version`; `V0051` creates `engine_capability` with the unique
constraint and FK. No per-tenant table is created (INV-GEST-3).

## Spec de referencia
- SPEC-04 (data model and migrations — V0050–V0059 range)
- contracts/data-model.md §2.1–2.2, §4

## Escopo
- [ ] implementar `src/main/resources/db/migration/global/V0050__create_engine_version.sql`
- [ ] implementar `src/main/resources/db/migration/global/V0051__create_engine_capability.sql`

## Resultado esperado
Both scripts are executable DDL matching exactly the SQL in `contracts/data-model.md §2.1–2.2`
(engine_version table + status check + index; engine_capability table + unique + FK RESTRICT + indexes
+ comments). MIG module picks them up without conflict.

## Criterios de aceite
- [ ] AC-1: `V0050` creates `engine_version` with PK `id uuid`, UNIQUE `version`, `CHECK (status IN ('active','deprecated'))`, `ix_engine_version_status` index.
- [ ] AC-2: `V0051` creates `engine_capability` with PK `id uuid`, UNIQUE `(engine_version_id, gesture_type_code)`, `CHECK (support_status IN ('supported','experimental','unsupported'))`, FK `ON DELETE RESTRICT`, `ix_engine_capability_version` and `ix_engine_capability_code` indexes.
- [ ] AC-3: Both scripts begin with `SET search_path TO neuroassist_global;` or equivalent schema routing so MIG applies them to the global schema.
- [ ] AC-4: No `tenant_id` column in either table (INV-GEST-3).
- [ ] AC-5: Flyway checksum stable — no trailing whitespace or BOM in the files.

## Dependencias
- GEST-006 (precede — EngineVersion domain design finalized)
- GEST-007 (precede — EngineCapability domain design finalized)

## Estimativa
S

## Prioridade
P3
