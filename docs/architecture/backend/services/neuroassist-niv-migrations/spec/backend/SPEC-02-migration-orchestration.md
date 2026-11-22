# SPEC-02 — Migration Orchestration (Core)

## Objetivo
Especificar o núcleo de MIG: a ordem determinística **baseline → global pass →
tenant pass**, a isolação por schema e a condução programática do Flyway por schema.

## Escopo
**In:** sequência dos passes, baseline garantido, loop por tenant, condução do Flyway
por schema, abort em falha.
**Out:** criação/enumeração de schema (SPEC-03), regra de próxima versão e
imutabilidade (SPEC-05), data model (SPEC-04).

## Decisões técnicas
- MIG constrói e executa **uma instância Flyway por schema** (ADR-002) — o runner
  single-datasource do Spring Boot não itera N tenants, por isso
  `spring.flyway.enabled: false`.
- Global pass precede o tenant pass (DDL de tenant pode referenciar catálogos/extensões globais) — doc 04.
- Baseline (`V0001–V0009`, ADR-004) garantido antes de qualquer bloco de módulo.

## Implementação (componentes)
- `MigrationsJobRunner` — orquestra: `SchemaAdmin.ensureBaseline()` → global pass →
  (se modo exige) tenant pass; agrega o resultado e define exit code.
- `SchemaAdmin` — `CREATE EXTENSION` / `CREATE SCHEMA` via JDBC admin **fora** de
  qualquer `@Transactional` (INV-MIG-6).
- `FlywayRunner` — monta `Flyway` por schema (schemas, `search_path`, locations
  `db/migration/global` vs `db/migration/tenant` — ver `integration-contracts.md` §2).

### Pseudo-fluxo `--all`
```
ensureBaseline()                        # extensions + neuroassist_global + registry (idempotente)
report.global = flywayRunner.run(neuroassist_global, GLOBAL_LOCATION)
if report.global.failed: abort(exit 2, "neuroassist_global")
for schema in tenantEnumerator.list():  # t_* (SPEC-03)
    report[schema] = flywayRunner.run(schema, TENANT_LOCATION, searchPath=[schema, neuroassist_global])
    if report[schema].failed: abort(exit 2, schema)
exit 0
```

## Casos de borda
- Global pass falha → **nenhum** tenant é tocado; exit 2.
- Falha em um tenant → run abortado nomeando o schema; não há retry nem swallow.
- Zero tenants existentes em `--all` → só o global pass; exit 0.
- Run contra base já atualizada → no-op em cada schema; exit 0 (SPEC-05).

## Critérios de aceite (EARS)
`WHEN --all runs, THE SYSTEM SHALL apply the global block set to neuroassist_global and then the tenant-template set to every existing t_<tenantId> (INV-MIG-1).`
`THE SYSTEM SHALL apply the global pass before any tenant pass.`
`WHILE applying a tenant schema, THE SYSTEM SHALL keep neuroassist_global on the search_path (INV-MIG-5).`
`WHEN the baseline is absent, THE SYSTEM SHALL create extensions + neuroassist_global + registry before any module block (ADR-004).`
`THE SYSTEM SHALL perform CREATE SCHEMA/EXTENSION outside any @Transactional scope as a Flyway call (INV-MIG-6).`
`IF the global pass fails, THEN THE SYSTEM SHALL NOT touch any tenant schema and SHALL exit 2.`
`IF any tenant pass fails, THEN THE SYSTEM SHALL abort, name the schema, and exit 2 (ADR-005).`
`WHEN a successful --all run completes, THE SYSTEM SHALL leave neuroassist_global and every t_<tenantId> at the same target version (INV-MIG-1).`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
