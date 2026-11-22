# SPEC-04 — Data model + migrations

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).
> Canonical DDL: `../../contracts/data-model.md` · Multi-tenancy ADR `../../../../adr/ADR-003-multi-tenancy.md`.

## Objetivo

Specify EDGE's persistence and its Flyway migration plan. The `` ```sql `` blocks in
`../../contracts/data-model.md` are the **canonical contract** consumed by `be-migration-generator.py`
and `be-entity-generator.py`; this SPEC fixes the schema routing, the reserved Flyway range and the
constraints that back the invariants.

## Escopo

- **In:** the five tables (`device_pairing_code` global; `edge_device`, `edge_credential_revocation`,
  `cached_catalog`, `edge_detection_lapse` per-tenant), the ADR-005 detection-state columns on
  `edge_device`, their CHECKs/indexes, the schema routing, and the reserved range.
- **Out:** runtime query behavior (SPEC-02/03), security (SPEC-06).

## Decisões técnicas

- **Schema routing**: `device_pairing_code` → `neuroassist_global` (resolvable before tenant context,
  ADR-003); `edge_device` / `edge_credential_revocation` / `cached_catalog` → `t_<tenantId>`.
- **Flyway reserved range `V0030`–`V0032`** (next free `+10` block after ACS `V0010`–`V0012`, PAT
  `V0020`–`V0022`; `data-model.md` §5). Authored by EDGE, applied centrally by MIG. **ADR-005
  (SAFETY-GEST-1)** consumes the reserved additive slot **`V0032`** (detection-state columns +
  `edge_detection_lapse`); the additive reservation rolls forward to `V0033+`. Still inside the
  `V0030`–`V0032` block (not an extension of it).
- No cross-service FK (`patient_id`, `enrolled_by` id-only — INV-EDGE-8); the only FKs are
  `cached_catalog.device_id → edge_device` and `edge_credential_revocation.device_id → edge_device`
  (same per-tenant schema).
- Pairing codes hashed at rest; one live code per device (`UNIQUE (device_id)`).

## Implementação — migration plan

| Script | Schema | Content |
|---|---|---|
| `V0030__edge_global_init.sql` | global | `pgcrypto` (idempotent), `device_pairing_code` + indexes |
| `V0031__edge_tenant_init.sql` | per-tenant template | `edge_device`, `edge_credential_revocation`, `cached_catalog` + CHECKs/indexes |
| `V0032__edge_detection_state_and_lapse.sql` | per-tenant template | **ADR-005:** `ALTER edge_device ADD` detection-state columns + `chk_edge_device_detection_state` + sweep index; `CREATE edge_detection_lapse` + indexes (additive, nullable, no backfill) |
| `V0033+` | — | reserved for EDGE additive changes |

## Casos de borda

- A re-enroll replaces the live pairing code for a device (`UNIQUE (device_id)` on the global table).
- `connectivity` non-null while not `paired` → rejected (`chk_edge_device_connectivity_paired`).
- Unpair/revoke drops `cached_catalog` and lists the credential — the per-tenant FKs keep this
  consistent within the schema.

## Critérios de aceite (EARS)

- IF an insert omits `tenant_id` on any EDGE table, THEN THE SYSTEM SHALL reject it (`NOT NULL`, INV-EDGE-1).
- IF `edge_device.lifecycle_state` is not in `awaiting_claim|paired|deactivated|revoked`, THEN THE SYSTEM SHALL reject it (`chk_edge_device_lifecycle`).
- IF a token's `credential_id` is present in `edge_credential_revocation`, THEN THE SYSTEM SHALL treat it as dead (INV-EDGE-6).
- THE SYSTEM SHALL route `device_pairing_code` to `neuroassist_global` and the other four tables (`edge_device`, `edge_credential_revocation`, `cached_catalog`, `edge_detection_lapse`) to `t_<tenantId>` (ADR-003), using the reserved range `V0030`–`V0032`.
- IF `edge_device.detection_state` is outside `RUNNING|PAUSED|DEGRADED|UNAVAILABLE|UNKNOWN`, THEN THE SYSTEM SHALL reject it (`chk_edge_device_detection_state`, INV-EDGE-9).
- IF a second **open** `edge_detection_lapse` row is inserted for a device, THEN THE SYSTEM SHALL reject it (`uq_edge_detection_lapse_open`, INV-EDGE-10).
