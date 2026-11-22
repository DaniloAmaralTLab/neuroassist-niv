# INT-EVNT-004 -- MIG Flyway range V0040–V0044 — register with neuroassist-niv-migrations, verify execution order and tenant provisioning

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT authors Flyway scripts V0040–V0044; `neuroassist-niv-migrations` (MIG) applies them centrally.
MIG must be aware of the EVNT range to include the scripts in the migration run order and in
tenant provisioning (each new `t_<tenantId>` schema must run V0041/V0042/V0043). The reserved
range `V0040`–`V0044` (+10 after EDGE `V0030`–`V0032`) must not collide with other modules. The
extended range (V0043 escalation_attempt, V0044 guard) is a SAFETY-1 addition (ADR-005); the
next service block still starts at `V0050`. Confirm execution order: `V0040` (global) before
tenant-scoped scripts.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §4
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §5

## Escopo
- [ ] MIG to register EVNT range V0040–V0044 in its migration set
- [ ] Verify no range collision with ACS (V0010–V0012), PAT (V0020–V0022), EDGE (V0030–V0032)
- [ ] Verify V0040 runs against `neuroassist_global`; V0041–V0044 run against each `t_<tenantId>` and tenant template
- [ ] Confirm new-tenant provisioning includes V0041/V0042/V0043 (event + push_subscription + escalation_attempt)

## Criterios de aceite
- [ ] AC-1 MIG applies V0040–V0044 to a clean PostgreSQL instance without error
- [ ] AC-2 `event`, `push_subscription`, `escalation_attempt` tables exist in each `t_<tenantId>` schema after migration
- [ ] AC-3 New tenant provisioning includes all three EVNT tables from first schema creation
- [ ] AC-4 No range collision detected: next module starts at V0050

## Dependencias
- EVNT-007 (precede — migration scripts must be authored before MIG can register them)

## Estimativa
S

## Prioridade
P3
