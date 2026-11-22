<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Schema Strategy

Schema-per-tenant (shared `../../adr/ADR-003-multi-tenancy.md`). Two homes:

- **`t_<tenantId>` (per-tenant)** — `edge_device` and `cached_catalog`. A device belongs to
  exactly one tenant and one patient; its cached catalog lives beside it (INV-EDGE-1).
- **`neuroassist_global` (global)** — `device_pairing_code`. The pairing code must be
  resolvable at claim time *before* any tenant context exists (the station presents only
  the code), so the lookup `code → (tenantId, deviceId)` lives in the global schema
  (ADR-003 local). It holds no patient data — only the routing tuple + expiry.

Tenant context on human and device endpoints derives from the token claim, never from
`X-Tenant-Id`.

## Initial Entities

**`edge_device`** (per-tenant)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid | NOT NULL (INV-EDGE-1) |
| `patient_id` | uuid | PAT ref by id, no FK (INV-EDGE-8) |
| `lifecycle_state` | text | `awaiting_claim \| paired \| deactivated \| revoked` |
| `connectivity` | text | `online \| offline` (BA `status`), meaningful while `paired` |
| `last_heartbeat_at` | timestamptz | null until first beat |
| `paired_at` | timestamptz | null until paired |
| `enrolled_by` | uuid | caregiver id (ACS ref, no FK) |
| `credential_id` | text | current `edge.device` token identity (jti/kid), null until paired |
| `created_at` / `updated_at` | timestamptz | |

**`cached_catalog`** (per-tenant)

| Column | Type | Notes |
|---|---|---|
| `device_id` | uuid PK/FK → `edge_device` | one cache per device |
| `patient_id` | uuid | redundant for query convenience |
| `pat_etag` | text | last ETag from PAT (`If-None-Match`) |
| `payload` | jsonb | resolved commands served to the device |
| `fetched_at` | timestamptz | last successful `200` from PAT |

**`device_pairing_code`** (global)

| Column | Type | Notes |
|---|---|---|
| `code` | text PK (or unique) | single-use secret (hashed at rest) |
| `tenant_id` | uuid | resolution target |
| `device_id` | uuid | resolution target |
| `expires_at` | timestamptz | short-lived (INV-EDGE-3) |
| `consumed_at` | timestamptz | null until claimed; non-null ⇒ spent |

## Migration Strategy

Java stack → **Flyway**, owned centrally by MIG (`neuroassist-niv-migrations`), consistent
with the project's centralized-migrations decision. EDGE contributes versioned scripts for
`edge_device` + `cached_catalog` into every `t_<tenantId>` schema and for
`device_pairing_code` into `neuroassist_global`. No per-service standalone Flyway runner
(MIG owns the full migration surface across schemas).

## Data Lifecycle

- **Pairing codes** are ephemeral: created on enroll, consumed on claim, expired by TTL; a
  swept job may purge `expired`/`consumed` rows (no retention value, reduces the global
  table footprint).
- **Cached catalogs** are derived, not source-of-truth: they can be rebuilt by a fresh PAT
  pull. Retained per paired device; dropped on unpair/revoke.
- **Devices** are soft-stated: `deactivate` and `revoke` retain the row for audit; `revoke`
  is terminal (credential never reinstated — INV-EDGE-6). No hard delete in the MVP so the
  HIST trail keeps resolving historical references by device id.
- **No video, no biometric payload** is ever persisted by EDGE (TECH-002); only device
  metadata and the patient's command catalog (labels + thresholds), under internal-network
  operation (OPS-002) with TLS outside localhost (TECH-006). LGPD-dedicated mechanisms are
  deferred at the project level, not waived.
