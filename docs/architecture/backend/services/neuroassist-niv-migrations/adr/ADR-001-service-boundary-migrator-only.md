<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — MIG service boundary: single standalone migrator job

## Status
aceita

> Note: orchestrator default (recommendation) - revisable by the owner.

## Contexto

Schema evolution for NeuroAssist NIV could be (a) a dedicated job that owns the whole
migration surface, or (b) left to each service running its own Flyway, or (c) folded into
another infrastructure process (e.g. REG or an ops tool). The project is schema-per-tenant
(`../../../adr/ADR-003-multi-tenancy.md`): migrations must hit `neuroassist_global` **and
every** `t_<tenantId>`, all on the same version. Every business `application.yml` already
ships `spring.flyway.enabled: false` with the note that migrations are "gerenciadas pelo
neuroassist-niv-migrations", and every data-owning service's doc 05 records "no per-service
Flyway runner" — so option (b) is already excluded on disk. The migrator needs a privileged
datasource (`CREATE SCHEMA`/`EXTENSION`) that no business service should carry.

## Decisão

MIG is a **single, standalone service** (`neuroassist-niv-migrations`) whose **only**
responsibility is to create and version every schema. It exposes no business REST API, owns
no domain aggregate and no business data (only `migration_range_registry` + Flyway history),
and is not decomposed into further units. It is **not** folded into any other process:
co-locating the privileged migrator with a running service would leak admin DDL rights into
that service and couple schema evolution to its lifecycle. The *how* of running this job is
ADR-002; the *what* it applies is ADR-003/ADR-004.

## Consequências

- **Positive:** one auditable owner of schema state; the admin credential is confined to this
  job and kept out of every business service.
- **Positive:** independent lifecycle — MIG runs before the fleet, at deploy and at tenant
  provisioning, decoupled from any service's startup.
- **Negative / trade-off:** one more deployment unit to run and monitor. Accepted: centralising
  N+1-schema migration in one place and keeping admin rights isolated outweighs a tiny extra
  job. Folding MIG elsewhere is revisitable only on a concrete operational driver.
