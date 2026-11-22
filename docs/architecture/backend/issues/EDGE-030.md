# EDGE-030 -- Flyway V0032 — detection-state columns on `edge_device` + `edge_detection_lapse` table (ADR-005)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

ADR-005 (SAFETY-GEST-1) consumes the reserved slot **`V0032`** in EDGE's migration block
(`V0030`–`V0032`). The script is an **additive per-tenant migration** (no data backfill, all new
columns nullable, default `UNKNOWN` at the application layer, INV-EDGE-9) composed of two parts:
1. `ALTER TABLE edge_device ADD` the five detection-state columns (`detection_state`,
   `detection_state_since`, `detection_reason`, `engine_version`, `last_detecting_at`) plus the
   `chk_edge_device_detection_state` CHECK and the `idx_edge_device_detection_sweep` covering
   index used by the lapse sweep.
2. `CREATE TABLE edge_detection_lapse` with its partial unique index
   (`uq_edge_detection_lapse_open`) that enforces one open episode per device (INV-EDGE-10), and
   the two supporting indexes (`uq_edge_detection_lapse_key`, `idx_edge_detection_lapse_patient`).

The script targets the **per-tenant template schema** (`t_<tenantId>`); no global-schema changes
are needed (all tables are per-tenant). The additive reservation rolls forward to `V0033+`.

## Spec de referencia
- SPEC-04 (§Decisões técnicas — Flyway reserved range; §Implementação — V0032 content)
- data-model.md §2.2 (detection-state columns + indexes on `edge_device`)
- data-model.md §2.5 (full `edge_detection_lapse` DDL with invariants INV-EDGE-10)

## Escopo
- [ ] criar `backend/services/edge-service/src/main/resources/db/migration/V0032__edge_detection_state_and_lapse.sql` — conteúdo exactamente como especificado em `data-model.md §2.2` (colunas + constraint + index) e `data-model.md §2.5` (CREATE TABLE + indexes); comentário `-- schema: tenant` na primeira linha
- [ ] verificar que o script corre idempotente em modo `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para não falhar num schema já parcialmente migrado durante o desenvolvimento

## Criterios de aceite
- [ ] AC-1 `V0032` applies on a schema that already has `V0031`; `edge_detection_lapse` table created with `uq_edge_detection_lapse_open` partial unique index (INV-EDGE-10)
- [ ] AC-2 `edge_device.detection_state` column added with `CHECK (detection_state IS NULL OR detection_state IN ('RUNNING','PAUSED','DEGRADED','UNAVAILABLE','UNKNOWN'))` (INV-EDGE-9)
- [ ] AC-3 `idx_edge_device_detection_sweep` index created on `(lifecycle_state, detection_state, last_detecting_at)` (supports the lapse sweep query)

## Dependencias
- EDGE-012 (V0031 — must precede in Flyway order)
- INT-EDGE-008 (MIG must register V0032 to include it in central migration runs)

## Estimativa
S

## Prioridade
P3
