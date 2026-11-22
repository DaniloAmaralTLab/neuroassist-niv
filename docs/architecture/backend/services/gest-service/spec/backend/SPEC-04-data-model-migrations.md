# SPEC-04 — Data Model & Migrations

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.
> Canonical DDL: `../../contracts/data-model.md`.

## Objetivo
Specify GEST's two global tables and the Flyway migration plan on the global schema.

## Escopo
- **In:** `engine_version`, `engine_capability` on `neuroassist_global`; Flyway `V0050`–`V0059`.
- **Out:** per-tenant tables (none exist); PAT's `gesture_type` (owned by PAT).

## Decisões técnicas
- Global schema (INV-GEST-3, local ADR-003): **no `tenant_id`** on any table.
- `gesture_type_code` is a reference **by value** to PAT (INV-GEST-1), never an FK across schemas.
- Append-only: `ON DELETE RESTRICT` on the capability→version FK; soft-retire via status columns.

## Implementação
- `V0050__create_engine_version.sql`, `V0051__create_engine_capability.sql` (executable DDL in
  `data-model.md` §2), applied to `neuroassist_global` through the centralized **MIG** module.
- Reserved range **`V0050`–`V0059`** recorded (ACS `0010–0012`, PAT `0020–0022`, EDGE `0030–0032`,
  EVNT `0040–0044`).

## Casos de borda
- Deleting an engine version referenced by a capability → DB rejects (`RESTRICT`).
- Unique violation on `(engine_version_id, gesture_type_code)` → surfaces as the declare upsert path,
  not an insert error (INV-GEST-2).

## Critérios de aceite (EARS)
- THE SYSTEM SHALL apply all GEST migrations to `neuroassist_global` only and SHALL NOT create a
  `tenant_id` column (INV-GEST-3).
- THE SYSTEM SHALL enforce `UNIQUE (engine_version_id, gesture_type_code)` (INV-GEST-2) and
  `CHECK (support_status IN ('supported','experimental','unsupported'))`.
- IF a delete of a referenced `engine_version` is attempted, THEN the database SHALL reject it.
