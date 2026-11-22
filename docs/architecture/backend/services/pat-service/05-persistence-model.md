<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Persistence: PostgreSQL via Spring Data JPA · Schema-per-tenant
> (`../../adr/ADR-003-multi-tenancy.md`) · Migrations authored here, applied **centrally**
> by MIG (`neuroassist-niv-migrations`). Draft — canonical SQL is produced by Specs.

## Schema Strategy

Two tiers, following ACS:

- **`neuroassist_global`** — the PAT-owned `gesture_type` primitive catalog. Global
  because the vocabulary is shared across tenants and must be readable to compose a
  command before (and independent of) any tenant's data (ADR-002).
- **`t_<tenantId>`** — per-tenant `patient` and `command`. Routed per request from the
  JWT `tenantId` claim. `tenant_id` retained NOT NULL on both for defence-in-depth and
  audit joins (INV-PAT-1).

Cross-service references (`device_id` → EDGE; `created_by` → ACS Caregiver;
`patient_id` referenced by ACS/EDGE/EVNT) are **id-only, no FK across the boundary**.

## Initial Entities

| Table | Schema | Notes |
|---|---|---|
| `gesture_type` | `neuroassist_global` | `id` uuid PK, `code` varchar unique, `display_name`, `description`, `created_at`. Seeded; append-only (MVP). |
| `patient` | `t_<tenantId>` | `id` uuid PK, `tenant_id` NOT NULL, `label`, `device_id` uuid NULL (→ EDGE), `status` varchar CHECK (`active`,`inactive`), `created_by` uuid (→ Caregiver), `created_at`, `updated_at`. |
| `command` | `t_<tenantId>` | `id` uuid PK, `tenant_id` NOT NULL, `patient_id` uuid NOT NULL (→ `patient`), `label`, `urgency` varchar CHECK (`emergency`,`routine`), `sensitivity` varchar CHECK (`low`,`medium`,`high`), `primary_primitive_id` uuid NOT NULL (→ `gesture_type`), `secondary_primitive_id` uuid NULL (→ `gesture_type`), `min_gesture_time_ms` int, `max_gesture_time_ms` int, `status` varchar CHECK (`active`,`retired`), `created_by` uuid, `created_at`, `updated_at`. |

Conventions mirror ACS: UUID PKs `DEFAULT gen_random_uuid()` (pgcrypto), `timestamptz`
defaults, enums as `varchar` + CHECK, snake_case identifiers.

Draft constraints: `chk_command_window CHECK (min_gesture_time_ms > 0 AND
max_gesture_time_ms >= min_gesture_time_ms)` (INV-PAT-3); `chk_command_distinct_primitives
CHECK (secondary_primitive_id IS NULL OR secondary_primitive_id <> primary_primitive_id)`
(INV-PAT-4). FK from `command.primary/secondary_primitive_id` to global `gesture_type`
crosses schemas but stays **within PAT** (allowed); confirm cross-schema FK against the
live migrator in Specs (see §Gaps in doc 06).

## Migration Strategy

Flyway, authored by PAT, applied centrally by MIG. ACS reserved `V0010–V0012`. **PAT
proposes a non-colliding reserved range** (to be confirmed against the central MIG range
registry before scaffold — doc 06 gap):

| Range | Schema target | Content |
|---|---|---|
| `V0020__pat_global_init.sql` | global | `gesture_type` + seed primitives |
| `V0021__pat_tenant_init.sql` | per-tenant template | `patient`, `command` + checks/indexes |
| `V0022+` | — | reserved for PAT additive changes |

Per-tenant scripts are applied by MIG to each `t_<tenantId>` schema at onboarding and on
subsequent runs (same mechanism ACS relies on).

## Data Lifecycle

- **No hard deletes** for `patient` (status `active`/`inactive`) or `command`
  (status `active`/`retired`); rows retained so HIST audit entries and historical EVNT
  `Event` rows keep resolving their `command_id`/`patient_id` references.
- **`gesture_type`** append-only in the MVP (removing a primitive would orphan commands);
  retiring a primitive is a future decision.
- **Retention / LGPD erasure** deferred (internal-network-only); when required, erasure
  must reconcile with HIST immutability and with id references held by other services —
  flagged in doc 06.
- **Indexes (draft):** `command(patient_id, status)` for the hot active-catalog read;
  `command(tenant_id)`; `patient(tenant_id)`.
