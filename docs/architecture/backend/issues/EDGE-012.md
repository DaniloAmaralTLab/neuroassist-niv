# EDGE-012 -- Flyway V0031__edge_tenant_init.sql — tenant schema: edge_device + edge_credential_revocation + cached_catalog

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Author Flyway script `V0031__edge_tenant_init.sql` for the per-tenant `t_<tenantId>` schema.
Content: `CREATE TABLE edge_device` (with `chk_edge_device_lifecycle`, `chk_edge_device_connectivity`,
`chk_edge_device_connectivity_paired`, partial unique index on `credential_id`),
`CREATE TABLE edge_credential_revocation` (FK to `edge_device`), and
`CREATE TABLE cached_catalog` (FK to `edge_device`), plus all indexes as in `data-model.md §2.2–2.4`.
Applied by MIG to each `t_<tenantId>` schema at onboarding.

## Spec de referencia
- SPEC-04 (migration plan V0031, tenant schema routing)
- data-model.md §2.2–2.4 (edge_device, edge_credential_revocation, cached_catalog DDL)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/resources/db/migration/V0031__edge_tenant_init.sql`
## Criterios de aceite
- [ ] AC-1 `V0031__edge_tenant_init.sql` applies cleanly to a fresh tenant schema
- [ ] AC-2 `chk_edge_device_lifecycle` CHECK rejects values outside `awaiting_claim|paired|deactivated|revoked`
- [ ] AC-3 `chk_edge_device_connectivity_paired` CHECK rejects non-null `connectivity` when `lifecycle_state != 'paired'`
- [ ] AC-4 Both FK constraints (`edge_credential_revocation.device_id` and `cached_catalog.device_id`) reference `edge_device`

## Dependencias
- EDGE-011 (global script applies first), EDGE-002, EDGE-003

## Estimativa
S

## Prioridade
P3
