# INT-HIST-005 -- MIG applies HIST Flyway V0060-V0069 — global schema (neuroassist_global): V0062 audit_record_global, V0063 audit_retention_policy, V0064 audit_source; tenant schema (all t_<tenantId>): V0060 audit_record, V0061 audit_subject_key, V0065 ix_audit_record_patient_time; new-tenant provisioning path includes audit tables

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

HIST's Flyway scripts live in `hist-service` for authoring and local dev, but are **applied to the
shared database by MIG** (`neuroassist-niv-migrations`) — the canonical migration service (ADR-004).
MIG must be updated to:

1. Copy / reference V0060–V0069 scripts from `hist-service`.
2. Apply global-schema scripts (V0062, V0063, V0064) against `neuroassist_global`.
3. Apply tenant-schema scripts (V0060, V0061) against every existing `t_<tenantId>` schema.
4. Apply V0065 (additive index) against each tenant schema.
5. Update the new-tenant provisioning path so that newly created tenants also receive the
   `audit_record` and `audit_subject_key` tables.

This is an MIG-side task. HIST's local Flyway config (`spring.flyway.*`) is used only for
local developer testing; MIG owns production schema lifecycle.

## Spec de referencia

- data-model.md §1 (Flyway range V0060-V0069 assigned to HIST) + §2 (DDL per table + schema scope)
- integration-contracts.md (MIG–HIST migration contract)

## Escopo

- [ ] MIG: ingest V0060-V0065 scripts into the MIG migration inventory (global + tenant-scoped sets)
- [ ] MIG: add V0060/V0061 to new-tenant provisioning template
- [ ] HIST: local `application-test.yml` Flyway config is confirmed dev-only (not used by MIG)

## Criterios de aceite

- [ ] AC-1 After MIG run on a fresh cluster: `neuroassist_global` contains `audit_record_global`, `audit_retention_policy`, `audit_source` tables
- [ ] AC-2 After MIG run: each `t_<tenantId>` schema contains `audit_record` and `audit_subject_key`
- [ ] AC-3 `ix_audit_record_patient_time` exists in each tenant schema (V0065)
- [ ] AC-4 New tenant provisioned after MIG update: tenant schema includes all 2 audit tables from first creation
- [ ] AC-5 MIG idempotency: re-applying on an existing DB with the tables already present exits 0 (Flyway `--skip-executing-migrations`)

## Dependencias

- HIST-006 (DDL scripts must be authored before MIG ingests them)
- HIST-007 (V0065 script)

## Estimativa

M

## Prioridade
P3
