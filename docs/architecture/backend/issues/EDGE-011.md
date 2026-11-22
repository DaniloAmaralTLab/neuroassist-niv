# EDGE-011 -- Flyway V0030__edge_global_init.sql — global schema: device_pairing_code + pgcrypto

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Author Flyway script `V0030__edge_global_init.sql` for the `neuroassist_global` schema. Content:
`CREATE EXTENSION IF NOT EXISTS pgcrypto` (idempotent) and `CREATE TABLE device_pairing_code` with
all columns, `PRIMARY KEY(code_hash)`, `UNIQUE(device_id)`, and two indexes (`idx_pairing_code_expires`,
`idx_pairing_code_device`) as defined in `data-model.md §2.1`. Script is **authored here** in
`edge-service` and **applied centrally by MIG** (`neuroassist-niv-migrations`); no local Flyway
runner in `edge-service` (`spring.flyway.enabled=false`).

## Spec de referencia
- SPEC-04 (migration plan, range V0030–V0032, global schema routing)
- data-model.md §2.1 (device_pairing_code DDL)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/resources/db/migration/V0030__edge_global_init.sql`
## Criterios de aceite
- [ ] AC-1 `V0030__edge_global_init.sql` applies cleanly to a fresh `neuroassist_global` schema (reviewed by MIG — INT-EDGE-004)
- [ ] AC-2 Script contains `CREATE EXTENSION IF NOT EXISTS pgcrypto` as first statement
- [ ] AC-3 `UNIQUE(device_id)` constraint is present in `device_pairing_code`
- [ ] AC-4 `./gradlew :edge-service:compileJava` exits 0

## Dependencias
- EDGE-002, EDGE-003 (domain defines the tables)

## Estimativa
S

## Prioridade
P3
