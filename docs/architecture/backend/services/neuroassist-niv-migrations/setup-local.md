# MIG — Local Setup (neuroassist-niv-migrations)

> Infrastructure migrator **job** — **no HTTP port**, no broker, not a Eureka client,
> no PHI. It is a one-shot `CommandLineRunner`: it applies migrations and exits. Run
> it **before** starting the rest of the fleet (every service expects its schema to
> exist and be on-version).

## HTTP port

**None.** MIG runs with `spring.main.web-application-type: none` and no `server.port`
(ADR-002). It exposes no endpoint; its contract is the run mode + exit code
(`contracts/api-contract.md`).

## Local dependencies

| Dependency | Needed for | Local |
|---|---|---|
| **PostgreSQL** | the only runtime dependency — admin datasource with `CREATE SCHEMA` / `CREATE EXTENSION` | `localhost:5432` (dev) |
| _(none else)_ | no broker, no Eureka, no JWKS, no TechLab AI | — |

## Environment variables

| Var | Purpose | Example |
|---|---|---|
| `SPRING_DATASOURCE_URL` | admin PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/neuroassist` |
| `SPRING_DATASOURCE_USERNAME` | admin user (`CREATE SCHEMA`/`EXTENSION`) | `neuroassist_admin` |
| `SPRING_DATASOURCE_PASSWORD` | admin password (secret-injected) | `***` |
| `MIG_GLOBAL_SCHEMA` | global schema name | `neuroassist_global` |
| `MIG_TENANT_SCHEMA_PREFIX` | tenant schema prefix | `t_` |

> The admin credential is **more privileged** than any runtime role and must live
> only in this job, never in a business service (SPEC-06, doc 06 R9).

## Run modes

```bash
# full pass: baseline + global + every existing tenant (default production mode)
./gradlew :services:neuroassist-niv-migrations:bootRun --args="--all"

# global schema only (no tenant pass)
./gradlew :services:neuroassist-niv-migrations:bootRun --args="--global-only"

# migrate one already-existing tenant
./gradlew :services:neuroassist-niv-migrations:bootRun --args="--tenant unitA"

# provision a brand-new tenant and bring it to the current version
./gradlew :services:neuroassist-niv-migrations:bootRun --args="--provision-tenant unitC"
```

Exit codes: `0` success (incl. no-op) · `1` usage error · `2` migration failure
(message names the failing schema).

## Build and test

```bash
./gradlew :services:neuroassist-niv-migrations:build     # install deps + build
./gradlew :services:neuroassist-niv-migrations:test      # unit + Testcontainers tests
./gradlew :services:neuroassist-niv-migrations:cucumber  # BDD (tests/cucumber/*.feature)
```

## Verify

```bash
# global schema + registry exist and are on version
psql "$SPRING_DATASOURCE_URL" -c "\dn"                                   # list schemas
psql "$SPRING_DATASOURCE_URL" -c "TABLE neuroassist_global.migration_range_registry;"
psql "$SPRING_DATASOURCE_URL" -c "TABLE neuroassist_global.flyway_schema_history;"
```
