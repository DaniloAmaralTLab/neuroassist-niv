# INT-EDGE-008 -- MIG — register Flyway V0032 in MIG service docs (additive reservation consumed by ADR-005)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

EDGE's migration block `V0030`–`V0032` is entirely consumed by ADR-005: `V0030` (global init),
`V0031` (tenant init), and now **`V0032`** (detection-state columns + `edge_detection_lapse`
table, additive per-tenant). The existing INT-EDGE-004 tracked registration of `V0030`–`V0031`;
this issue extends the MIG docs snapshot to include `V0032`.

MIG applies migrations centrally to every `t_<tenantId>` schema; without V0032 in the MIG
manifest, the detection-state columns and `edge_detection_lapse` table will not be applied to
tenant schemas and EDGE-031/033 will fail at runtime.

Additionally, the additive reservation for EDGE now rolls forward to `V0033+` (the `V0032` slot
is consumed) and that should be reflected in MIG's cross-service reserved-range registry.

## Spec de referencia
- SPEC-04 (§Decisões técnicas — Flyway reserved range; §Implementação — V0032 slot consumed; additive reservation rolls to V0033+)
- data-model.md §5 (reserved-range registry + Flyway note for ADR-005)
- integration-contracts.md §4 (EDGE → MIG relationship)

## Escopo
- [ ] ao arquitectar MIG: incluir `V0032__edge_detection_state_and_lapse.sql` no manifesto de scripts per-tenant EDGE que MIG aplica; confirmar que V0032 tem a marcação `-- schema: tenant` e é aplicado após V0031 em cada `t_<tenantId>`
- [ ] actualizar o cross-service reserved-range registry em MIG docs para reflectir que EDGE `V0032` está consumido e a reserva activa rola para `V0033+`

## Criterios de aceite
- [ ] AC-1 After MIG runs against a fresh DB, the `edge_detection_lapse` table and all five detection-state columns on `edge_device` exist in every `t_<tenantId>` schema (SPEC-04; ADR-005)
- [ ] AC-2 MIG's reserved-range registry shows EDGE `V0030`–`V0032` as fully consumed and `V0033+` as the next available EDGE slot

## Dependencias
- INT-EDGE-004 (MIG — register V0030–V0031 baseline; this extends it)
- EDGE-030 (V0032 script authored — precede before MIG can register it)

## Estimativa
S

## Prioridade
P3
