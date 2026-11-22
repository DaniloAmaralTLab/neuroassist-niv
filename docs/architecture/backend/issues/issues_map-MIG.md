# Issues Map — MIG (neuroassist-niv-migrations)

Service: `neuroassist-niv-migrations` | Type: Infrastructure | FE: N/A | Messaging: disabled

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (CLI runner, modes, exit codes) | MIG-001, MIG-002, MIG-003 |
| SPEC-02 (migration orchestration) | MIG-004, MIG-005, MIG-006, MIG-018 |
| SPEC-03 (tenant provisioning + enumeration) | MIG-013, MIG-014, MIG-019 |
| SPEC-04 (data model, baseline block V0001-V0009, registry) | MIG-007, MIG-008, MIG-009, MIG-010, MIG-011, MIG-015, MIG-021 |
| SPEC-05 (idempotency, forward-only, checksum) | MIG-020 |
| SPEC-07 (observability, logs, restart:no) | MIG-016, MIG-023, MIG-024 |
| SPEC-08 (BDD Testcontainers) | MIG-017, MIG-018, MIG-019, MIG-020, MIG-021 |
| SPEC-10 (integrations, aggregation, CI gate) | MIG-012, MIG-022 |

## By Priority

| Priority | Issues |
|---|---|
| P1 | MIG-001, MIG-002, MIG-003 |
| P2 | MIG-004, MIG-005, MIG-006 |
| P3 | MIG-007, MIG-008, MIG-009, MIG-010, MIG-011 |
| P4 | MIG-012, MIG-013, MIG-014 |
| P5 | MIG-015 |
| P6 | (none) |
| P7 | MIG-016 |
| P8 | MIG-017, MIG-018, MIG-019, MIG-020, MIG-021 |
| P9 | MIG-022, MIG-023, MIG-024 |

## INT Issues by upstream module

| Issue | Upstream | Reserved Block | confirmed |
|---|---|---|---|
| INT-MIG-001 | ACS | V0010-V0012 | TRUE |
| INT-MIG-002 | PAT | V0020-V0022 | TRUE |
| INT-MIG-003 | EDGE | V0030-V0032 | TRUE |
| INT-MIG-004 | CONV | V0070-V0079 | TRUE |
| INT-MIG-005 | EVNT | V0040-V0049 | FALSE (propose → confirm) |
| INT-MIG-006 | GEST | V0050-V0059 | FALSE (propose → confirm) |
| INT-MIG-007 | HIST | V0060-V0069 | FALSE (propose → confirm) |
| INT-MIG-008 | TRN | V0080-V0089 | FALSE (blocked on TRN backlog) |

## By Layer

| Layer | Issues |
|---|---|
| application (runner, orchestrator) | MIG-001, MIG-002, MIG-003, MIG-006, MIG-016 |
| infrastructure (SchemaAdmin, FlywayRunner, Enumerator) | MIG-004, MIG-005, MIG-013, MIG-014 |
| domain (MigrationMode, RangeRegistry) | MIG-002, MIG-015 |
| migration scripts (global) | MIG-007, MIG-008, MIG-009, MIG-010 |
| migration scripts (tenant) | MIG-011 |
| build / infra | MIG-012, MIG-022, MIG-023, MIG-024 |
| test (BDD) | MIG-017, MIG-018, MIG-019, MIG-020, MIG-021 |

## Learning pitfalls applied

| Pitfall | Applied in |
|---|---|
| `multitenancy:shared-schema:generic-table-name-collision` | MIG-009 (migration_range_registry uses `migration_` prefix, not generic name) |
| `migration:applied-file-edited:checksum-mismatch-blocks-migrate-all` | MIG-020, MIG-022 (CI gate treats committed V*.sql as frozen; forward-only enforced) |
