<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Multi-tenant, schema-per-tenant (ADR-003 shared). PostgreSQL.

## Schema Strategy

- **Per-tenant data** lives in `t_<tenantId>` schemas: the `event` table is **per-tenant** (every
  event belongs to exactly one care unit). Tenant routing derives from the JWT `tenantId` claim
  (INV-EVNT-1); EVNT never reads tenant from the request body or `X-Tenant-Id`.
- **Global schema** (`neuroassist_global`): EVNT owns **no** global table. The tenant registry,
  patient, command and device rows are owned by ACS / PAT / EDGE respectively; EVNT holds only opaque
  references (`patientId`, `commandId`, `deviceId`) with **no cross-service foreign keys**.
- The idempotency guard for ingest is a **per-tenant** uniqueness on `(device_id, report_id)`.

## Initial Entities

`event` (per-tenant, `t_<tenantId>`):

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | uuid | not null (defense-in-depth; row-level tenant tag) |
| `patient_id` | uuid | not null, indexed (read surface filters by patient) |
| `command_id` | uuid | not null (opaque PAT ref — no FK) |
| `command_label` | text | not null (snapshot — ADR-004 local) |
| `urgency` | text | not null, check in (`emergency`, `routine`) |
| `device_id` | uuid | not null (opaque EDGE ref — no FK) |
| `report_id` | text | not null |
| `occurred_at` | timestamptz | not null |
| `confirmed_at` | timestamptz | null |
| `confirmed_by` | uuid | null (opaque ACS caregiver ref) |
| `feedback` | text | not null default `not_evaluated`, check in (`not_evaluated`, `real`, `false_positive`) |
| `created_at` | timestamptz | not null default now() |

Indexes / constraints:

- **UNIQUE** `(device_id, report_id)` — enforces INV-EVNT-4 (exactly-once per gesture) at the DB.
- Partial index for the active-alarm query: `(patient_id, occurred_at DESC) WHERE urgency =
  'emergency' AND confirmed_at IS NULL` (ADR-010 — serves "active alarm" without a second table).
- Index `(patient_id, occurred_at DESC)` for the History/read surface.

No "active_event" table is ever created (ADR-010; INV-EVNT-3).

## Migration Strategy

- **Flyway, applied centrally by MIG** (`neuroassist-niv-migrations`) — EVNT authors the scripts;
  there is no per-service Flyway runner (mirrors EDGE doc 05, ACS/PAT).
- Scripts create the `event` table + indexes in each `t_<tenantId>` schema template and in new-tenant
  provisioning.
- **TODO[architect]:** reserve EVNT's Flyway version range with MIG at backlog/scaffold (EDGE used
  `V0030`–`V0032`; EVNT must claim a non-colliding range).

## Data Lifecycle

- **Retention:** events are durable and immutable except for the `confirmed_*` and `feedback`
  columns (the two mutable axes — doc 03). An event is never hard-deleted in the MVP; History and the
  HIST audit trail depend on it.
- **Archival:** out of scope for the MVP; a later retention/archival policy (per-tenant, LGPD-aware —
  `_extensions.compliance.lgpd = true`) is a future signal, flagged in doc 06.
- **Source of truth:** EVNT's `event` table is the one source for "active alarm", Home's last event
  and History (ADR-010) — the desynchronization bug class is eliminated by construction.
- **PII:** an event carries no free-text PII beyond the opaque references and the command label
  (a family-chosen word, e.g. "water"); caregiver/patient identity stays in ACS/PAT.
