<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Schema Strategy
GEST **departs from the per-tenant default**: the detection-engine capability registry is a
**product-wide (global) truth**, exactly like PAT's global `GestureType` vocabulary. Engine support
does not vary by tenant — a model version either detects `BLINK` or it does not. Therefore all GEST
tables live in the **global schema `neuroassist_global`** (local ADR-003), carry **no `tenant_id`
column**, and disclose the same rows to every tenant. Tenant isolation does not apply because there is
no per-tenant data; access is governed by authority (read for all authenticated `gest.*` actors,
write for admin only).

## Initial Entities
Two global tables; no per-tenant entity exists.

### `engine_version` (global)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `version` | text, unique | engine/model release id, e.g. `1.3.0` |
| `display_label` | text | human label |
| `status` | text | `active` \| `deprecated` |
| `created_at` | timestamptz | |

### `engine_capability` (global)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `engine_version_id` | uuid FK → `engine_version(id)` | |
| `gesture_type_code` | text | PAT vocabulary `code` (not an FK — PAT owns it, cross-service reference by code, INV-GEST-1) |
| `support_status` | text | `supported` \| `experimental` \| `unsupported` |
| `notes` | text, nullable | tuning note |
| `declared_by` | text | admin actor id (JWT `sub`) |
| `declared_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraint: `UNIQUE (engine_version_id, gesture_type_code)` (INV-GEST-2). `gesture_type_code` is a
**reference by value** to PAT's global vocabulary, never a foreign key into another service's schema.

## Migration Strategy
Flyway, but applied to **`neuroassist_global`** and run through the centralized `MIG` migrations
module (consistent with how the other global artefacts — e.g. PAT's `gesture_type`, EDGE's
`device_pairing_code` — are provisioned). GEST contributes its global migration scripts; it does **not**
own a per-tenant `t_<tenantId>` migration set because it has no per-tenant table.

## Data Lifecycle
- **Append + soft-retire.** Capability rows are appended on declare; retirement sets
  `support_status = unsupported` (terminal) and retains the row for audit/history (INV-GEST-6).
- **No deletion** of engine versions that have ever been referenced (a station still on an old engine
  must keep resolving its support), mirroring PAT's append-only gesture-type policy.
- **No PII, no patient data, no video, no landmarks** — the registry holds only engine metadata and
  vocabulary codes, so LGPD data-subject concerns do not attach to GEST's store.
- **Retention:** indefinite (small, product-reference data); auditable via HIST for every write.
