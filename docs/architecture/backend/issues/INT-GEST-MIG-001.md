# INT-GEST-MIG-001 -- MIG to include GEST Flyway range V0050–V0059 in the centralized global migration set

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
GEST's DDL migrations (`V0050__create_engine_version.sql`, `V0051__create_engine_capability.sql`) are
authored in `gest-service/src/main/resources/db/migration/global/` and must be executed against the
`neuroassist_global` schema by the centralized MIG module. The range `V0050`–`V0059` is reserved for
GEST (data-model.md §4). This issue notifies MIG to include the GEST migration set in its execution
plan. `V0052`–`V0059` remain reserved for future GEST global schema changes.

## Spec de referencia
- SPEC-04 (data model — Flyway V0050–V0059 range)
- contracts/data-model.md §4

## Escopo
- [ ] MIG to register the GEST migration sources (`gest-service/.../global/V0050*.sql`,
  `V0051*.sql`) in the centralized Flyway execution configuration.
- [ ] MIG to verify that `V0050` and `V0051` apply cleanly to `neuroassist_global` without conflict
  with existing module migration ranges (ACS 0010–0012, PAT 0020–0022, EDGE 0030–0032, EVNT 0040–0044).

## Resultado esperado
Running the MIG module against a fresh `neuroassist_global` schema applies `V0050` and `V0051` in
order. `engine_version` and `engine_capability` tables exist in `neuroassist_global`.

## Criterios de aceite
- [ ] AC-1: MIG applies `V0050__create_engine_version.sql` and `V0051__create_engine_capability.sql` to `neuroassist_global` with Flyway reporting 2 migrations applied successfully.
- [ ] AC-2: No version conflict with existing module ranges (ACS/PAT/EDGE/EVNT scripts are unaffected).
- [ ] AC-3: GEST service has no Flyway auto-run configuration; all schema changes go through MIG only.

## Dependencias
- GEST-012 (precede — Flyway migration scripts authored in gest-service)

## Estimativa
S

## Prioridade
P3
