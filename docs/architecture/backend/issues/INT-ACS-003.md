# INT-ACS-003 -- MIG schema provisioning trigger (TenantService.onboard → t_{tenantId} schema creation)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

When `TenantService.onboard(...)` creates a new `tenant` row, it must trigger MIG to
provision the `t_<tenantId>` schema by applying `V0011__acs_tenant_init.sql`
(integration-contracts.md §2.3). ACS does not run Flyway directly; it signals MIG via
a `MigSchemaProvisionPort` (created in ACS-012).

This integration issue covers:
- `MigSchemaProvisionPort` interface (application/port/out) and its adapter
  (infrastructure/clients/mig/) that calls MIG's provisioning API.
- Contract: ACS calls a MIG internal endpoint (service-to-service, `platform-ops` token)
  that runs `flyway migrate` for the new schema.
- Resilience: if MIG fails, tenant creation rolls back (the schema cannot be missing while
  the tenant row exists — data integrity).

## Spec de referencia

- integration-contracts.md (§2.3 ACS → MIG schema ownership)
- data-model.md (§5 migration plan — V0010/V0011 ranges)

## Escopo

- [ ] implementar `backend/services/acs-service/src/main/java/com/neuroassist/acs/application/port/out/MigSchemaProvisionPort.java`
- [ ] implementar `backend/services/acs-service/src/main/java/com/neuroassist/acs/infrastructure/clients/mig/MigSchemaProvisionAdapter.java`

## Criterios de aceite

- [ ] AC-1 `MigSchemaProvisionPort.provisionSchema(UUID tenantId)` is an outbound port in `application/port/out/`; no Spring annotations (RULE-01)
- [ ] AC-2 `MigSchemaProvisionAdapter` calls a MIG service endpoint and raises a domain exception on failure (which rolls back the tenant creation in `TenantService`)
- [ ] AC-3 `TenantServiceTest` with mocked `MigSchemaProvisionPort` verifies: MIG failure → tenant row NOT saved (transaction rolled back)
- [ ] AC-4 `./gradlew :acs-service:test` exits 0

## Dependencias

- ACS-012 (precede — TenantService)

## Estimativa

S

## Prioridade
P4
