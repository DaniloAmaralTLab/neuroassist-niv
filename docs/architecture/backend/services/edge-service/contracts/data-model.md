# EDGE — Data Model

> Service: `edge-service` · Module **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> Persistence: PostgreSQL via Spring Data JPA · Schema-per-tenant
> (`../../../adr/ADR-003-multi-tenancy.md`) · Migrations authored here, applied
> **centrally** by MIG (`neuroassist-niv-migrations`). EARS guide:
> `../../../standards/ears-notation.md`.

The `` ```sql `` blocks below are the **canonical contract** consumed by
`be-migration-generator.py` (Flyway `V####__*.sql`) and `be-entity-generator.py` (JPA entities).
Each block's first line carries a `-- schema:` routing comment (`global` → `neuroassist_global`;
`tenant` → `t_<tenantId>`).

---

## 1. Conventions

Mirrors ACS / PAT (`../../pat-service/contracts/data-model.md`) for a uniform generator contract:

- **PK strategy:** UUID, `DEFAULT gen_random_uuid()` (`pgcrypto`). Columns typed `uuid`.
- **Timestamps:** `timestamptz`, `DEFAULT now()`; `created_at` on every table, `updated_at` where
  the row mutates.
- **Soft-delete / lifecycle:** no hard deletes for `edge_device`; `deactivate` / `revoke` retain
  the row so HIST audit entries keep resolving historical references by `device_id`. Pairing codes
  and cached catalogs are derived/ephemeral and may be swept.
- **Enums:** stored as `varchar` + `CHECK` (portable, generator-friendly), not native PG enums.
- **Encoding:** UTF-8; identifiers snake_case.
- **Tenant isolation:** `edge_device` and `cached_catalog` physically live in schema
  `t_<tenantId>`; `tenant_id` is retained `NOT NULL` for defence-in-depth and cross-schema audit
  joins (INV-EDGE-1). `device_pairing_code` is **global** so a tenantless station can resolve its
  tenant at claim time (ADR-003).
- **Cross-boundary references:** `patient_id` → PAT and `enrolled_by` → ACS `Caregiver` are
  **id-only, no FK across the service boundary** (INV-EDGE-8). The only foreign key is
  `cached_catalog.device_id → edge_device` (same per-tenant schema).
- **No video, no biometric payload** is ever persisted by EDGE (TECH-002); only device metadata and
  the patient's command catalog (labels + thresholds).

---

## 2. Entities

### 2.0 Extensions

```sql
-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2.1 `device_pairing_code` [global]

The short-lived, single-use routing tuple a tenantless station presents to claim its credential
(ADR-003). **Global** because the lookup `code → (tenantId, deviceId)` must resolve *before* any
tenant context exists — the station presents only the code. It holds **no patient data** — only the
routing tuple + expiry — and is swept after expiry/consumption. The code is **hashed at rest**
(Risk R2); the plaintext is returned exactly once at enroll and never stored.

```sql
-- schema: global
CREATE TABLE device_pairing_code (
    code_hash    text         NOT NULL,
    tenant_id    uuid         NOT NULL,
    device_id    uuid         NOT NULL,
    expires_at   timestamptz  NOT NULL,
    consumed_at  timestamptz  NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (code_hash),
    UNIQUE (device_id)
);
CREATE INDEX idx_pairing_code_expires ON device_pairing_code (expires_at);
CREATE INDEX idx_pairing_code_device  ON device_pairing_code (device_id);
COMMENT ON TABLE device_pairing_code IS 'Global single-use pairing routing tuple (ADR-003); code hashed at rest; resolves code->(tenant_id, device_id) before tenant context; no patient data; swept after expiry/consumption (INV-EDGE-3).';
```

**Invariants:** INV-EDGE-3 — a code is valid once and until `expires_at`; `consumed_at` non-null ⇒
spent; a consumed/expired code mints no credential (enforced in the `PairDevice` use case). One live
code per device (`UNIQUE (device_id)`); a re-enroll replaces it.

### 2.2 `edge_device` [tenant]

The aggregate root — the edge station bound to one patient of one tenant. EDGE owns the
`lifecycleState` dimension (ADR-001 local); the BA `EdgeDevice.status (online|offline)` maps to
`connectivity`, meaningful only while `paired`. `credential_id` is the current `edge.device` token
identity (jti/kid), null until paired, rotated on reactivation (G3) and nulled on revoke/unpair.

Since **ADR-005 (SAFETY-GEST-1)** the device also carries a **detection state** distinct from
connectivity: `detection_state` (`RUNNING|PAUSED|DEGRADED|UNAVAILABLE|UNKNOWN`) with
`detection_state_since`, an optional `detection_reason`, the reported `engine_version`, and
`last_detecting_at` (the last time the station reported `RUNNING`). These columns are nullable and
`UNKNOWN`-defaulting so an older station that omits `detectionState` is recorded as `UNKNOWN`,
never `RUNNING` (INV-EDGE-9, backwards compatible).

```sql
-- schema: tenant
CREATE TABLE edge_device (
    id                    uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id             uuid         NOT NULL,
    patient_id            uuid         NOT NULL,
    lifecycle_state       varchar(16)  NOT NULL DEFAULT 'awaiting_claim',
    connectivity          varchar(8)   NULL,
    last_heartbeat_at     timestamptz  NULL,
    detection_state       varchar(16)  NULL,
    detection_state_since timestamptz  NULL,
    detection_reason      varchar(32)  NULL,
    engine_version        varchar(32)  NULL,
    last_detecting_at     timestamptz  NULL,
    paired_at             timestamptz  NULL,
    enrolled_by           uuid         NOT NULL,
    credential_id         text         NULL,
    created_at            timestamptz  NOT NULL DEFAULT now(),
    updated_at            timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_edge_device_lifecycle
        CHECK (lifecycle_state IN ('awaiting_claim', 'paired', 'deactivated', 'revoked')),
    CONSTRAINT chk_edge_device_connectivity
        CHECK (connectivity IS NULL OR connectivity IN ('online', 'offline')),
    CONSTRAINT chk_edge_device_connectivity_paired
        CHECK (lifecycle_state = 'paired' OR connectivity IS NULL),
    CONSTRAINT chk_edge_device_detection_state
        CHECK (detection_state IS NULL
               OR detection_state IN ('RUNNING', 'PAUSED', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'))
);
CREATE INDEX idx_edge_device_tenant          ON edge_device (tenant_id);
CREATE INDEX idx_edge_device_patient         ON edge_device (patient_id);
CREATE INDEX idx_edge_device_watchdog        ON edge_device (lifecycle_state, connectivity, last_heartbeat_at);
CREATE INDEX idx_edge_device_detection_sweep ON edge_device (lifecycle_state, detection_state, last_detecting_at);
CREATE UNIQUE INDEX uq_edge_device_credential ON edge_device (credential_id) WHERE credential_id IS NOT NULL;
COMMENT ON TABLE edge_device IS 'Edge station aggregate; tenant-scoped (INV-EDGE-1); lifecycle awaiting_claim|paired|deactivated|revoked; connectivity meaningful only while paired; detection_state RUNNING|PAUSED|DEGRADED|UNAVAILABLE|UNKNOWN distinct from connectivity (ADR-005, INV-EDGE-9); credential_id = current edge.device jti/kid (INV-EDGE-2); patient_id/enrolled_by id-only (INV-EDGE-8); no hard delete.';
```

**Invariants:**

- INV-EDGE-1 — `tenant_id NOT NULL`, from the JWT claim only.
- INV-EDGE-4 — heartbeat/catalog require `lifecycle_state = 'paired'` (enforced in the use case +
  device-token guard); `chk_edge_device_connectivity_paired` keeps `connectivity` null unless
  paired.
- INV-EDGE-6 — `revoked` is terminal; the use case never transitions out of `revoked`; the CHECK
  constrains the value set. `credential_id` is nulled and added to the revocation list on revoke.
- INV-EDGE-8 — `patient_id` / `enrolled_by` are id-only references (no cross-service FK).
- INV-EDGE-9 — `chk_edge_device_detection_state` constrains the value set; an absent report is
  persisted as `UNKNOWN` (never `RUNNING`); `last_detecting_at` is advanced only on a `RUNNING`
  heartbeat and backs the lapse sweep.
- The partial unique index on `credential_id` enforces that a live credential identity maps to one
  device.

### 2.5 `edge_detection_lapse` [tenant]

The lapse-episode ledger (ADR-005, SAFETY-GEST-1). One **open** episode per device at a time
(partial unique index) makes the raise-to-EVNT idempotent (INV-EDGE-10): the sweep opens a row when
a paired device has not been `RUNNING` (or has stopped beating) for `N` minutes, records
`raised_to_evnt_at` once the EVNT raise succeeds, and sets `resolved_at` on recovery. `cause`
distinguishes a reported not-`RUNNING` state from pure heartbeat silence. `evnt_idempotency_key` is
the stable per-episode key EDGE sends to EVNT so a retried raise is deduped there.

```sql
-- schema: tenant
CREATE TABLE edge_detection_lapse (
    id                   uuid         NOT NULL DEFAULT gen_random_uuid(),
    device_id            uuid         NOT NULL,
    patient_id           uuid         NOT NULL,
    tenant_id            uuid         NOT NULL,
    cause                varchar(20)  NOT NULL,
    detection_state      varchar(16)  NULL,
    detection_reason     varchar(32)  NULL,
    last_detecting_at    timestamptz  NULL,
    started_at           timestamptz  NOT NULL DEFAULT now(),
    evnt_idempotency_key text         NOT NULL,
    raised_to_evnt_at    timestamptz  NULL,
    resolved_at          timestamptz  NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_edge_lapse_cause CHECK (cause IN ('NOT_RUNNING', 'HEARTBEAT_STOPPED')),
    FOREIGN KEY (device_id) REFERENCES edge_device (id)
);
CREATE UNIQUE INDEX uq_edge_detection_lapse_open ON edge_detection_lapse (device_id) WHERE resolved_at IS NULL;
CREATE UNIQUE INDEX uq_edge_detection_lapse_key  ON edge_detection_lapse (evnt_idempotency_key);
CREATE INDEX        idx_edge_detection_lapse_patient ON edge_detection_lapse (patient_id);
COMMENT ON TABLE edge_detection_lapse IS 'Detection-lapse episode ledger (ADR-005, SAFETY-GEST-1); one open episode per device (uq partial index) makes the EVNT raise idempotent (INV-EDGE-10); cause NOT_RUNNING|HEARTBEAT_STOPPED; evnt_idempotency_key = per-episode key sent to EVNT; resolved_at set on recovery.';
```

**Invariants:** INV-EDGE-10 — `uq_edge_detection_lapse_open` guarantees at most one open episode per
device, so the sweep raises to EVNT once per episode; `uq_edge_detection_lapse_key` dedups a retried
raise; `resolved_at` closes it exactly once on recovery.

### 2.3 `edge_credential_revocation` [tenant]

The immediate-revocation list (G1). A revoked/unpaired device's `credential_id` lands here; the
introspection endpoint (`POST /edge/device-tokens/introspect`) and the heartbeat-refresh path
consult it so a revoked token is never refreshed and fails introspection at once (INV-EDGE-6).
Per-tenant (a credential belongs to a tenant's device).

```sql
-- schema: tenant
CREATE TABLE edge_credential_revocation (
    credential_id text         NOT NULL,
    tenant_id     uuid         NOT NULL,
    device_id     uuid         NOT NULL,
    reason        varchar(16)  NOT NULL,
    revoked_at    timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (credential_id),
    CONSTRAINT chk_edge_revocation_reason CHECK (reason IN ('revoke', 'unpair', 'rotate')),
    FOREIGN KEY (device_id) REFERENCES edge_device (id)
);
CREATE INDEX idx_edge_revocation_device ON edge_credential_revocation (device_id);
COMMENT ON TABLE edge_credential_revocation IS 'Immediate edge.device revocation list (G1); consulted by introspection + heartbeat refresh; a listed credential_id is never refreshed and fails introspection (INV-EDGE-6); reason revoke|unpair|rotate (rotate = superseded on reactivation G3).';
```

**Invariants:** INV-EDGE-6 — a `credential_id` on this list is never reinstated; introspection
returns `active:false`; heartbeat returns `401`.

### 2.4 `cached_catalog` [tenant]

The last-known-good copy of the patient's PAT command catalog EDGE holds and serves offline
(ADR-004, INV-EDGE-5). One cache per device; derived (rebuildable by a fresh PAT pull), dropped on
unpair/revoke. `pat_etag` backs the conditional refresh to PAT (`If-None-Match`); `payload` is the
resolved commands served behind EDGE's own ETag.

```sql
-- schema: tenant
CREATE TABLE cached_catalog (
    device_id   uuid         NOT NULL,
    tenant_id   uuid         NOT NULL,
    patient_id  uuid         NOT NULL,
    pat_etag    text         NULL,
    payload     jsonb        NOT NULL,
    fetched_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id),
    FOREIGN KEY (device_id) REFERENCES edge_device (id)
);
CREATE INDEX idx_cached_catalog_patient ON cached_catalog (patient_id);
COMMENT ON TABLE cached_catalog IS 'Per-device last-good PAT command catalog served offline (ADR-004, INV-EDGE-5); payload = resolved commands; pat_etag backs If-None-Match refresh to PAT; derived, dropped on unpair/revoke; EDGE owns device-facing ETag and staleness.';
```

**Invariants:** INV-EDGE-5 — a catalog read serves this row even when PAT is unreachable; EDGE, not
PAT, owns staleness tolerance; `fetched_at` makes staleness observable (Risk R3).

---

## 3. Relations (ASCII)

```
[device_pairing_code] (global, code_hash PK)
      │  code_hash -> (tenant_id, device_id)  resolves a tenantless claim (ADR-003)
      ▼
[edge_device] (tenant) 1───1 [cached_catalog] (tenant)   (same-schema FK: cached_catalog.device_id)
      │  1───* [edge_credential_revocation] (tenant)      (same-schema FK: device_id)
      │  1───* [edge_detection_lapse] (tenant)            (same-schema FK: device_id; ≤1 open per device)
      │
      ├── patient_id  ──> (PAT) patient.id      (id-only, no FK — INV-EDGE-8)
      └── enrolled_by ──> (ACS) caregiver.id    (id-only, no FK — INV-EDGE-8)

edge_device.id <── referenced by id (no FK) ── (PAT) patient.device_id, (ACS) patient_session.device_id, (HIST) audit.subjectId
```

---

## 4. Schema-level mapping

| Table | Schema | Tier |
|---|---|---|
| `device_pairing_code` | `neuroassist_global` | global |
| `edge_device` | `t_<tenantId>` | per-tenant |
| `edge_credential_revocation` | `t_<tenantId>` | per-tenant |
| `cached_catalog` | `t_<tenantId>` | per-tenant |
| `edge_detection_lapse` | `t_<tenantId>` | per-tenant |

---

## 5. Migration plan (reserved ranges)

Flyway scripts authored by EDGE, applied centrally by MIG. **EDGE reserves `V0030`–`V0032`** — the
next free `+10` block after ACS (`V0010`–`V0012`) and PAT (`V0020`–`V0022`), per the convention in
PAT `data-model.md` §5 G1.

| Range | Schema target | Content |
|---|---|---|
| `V0030__edge_global_init.sql` | global | `pgcrypto` (idempotent), `device_pairing_code` + indexes |
| `V0031__edge_tenant_init.sql` | per-tenant template | `edge_device`, `edge_credential_revocation`, `cached_catalog` + CHECKs / indexes |
| `V0032__edge_detection_state_and_lapse.sql` | per-tenant template | **ADR-005 (SAFETY-GEST-1):** `ALTER TABLE edge_device ADD` the detection-state columns (`detection_state`, `detection_state_since`, `detection_reason`, `engine_version`, `last_detecting_at`) + `chk_edge_device_detection_state` + `idx_edge_device_detection_sweep`; `CREATE TABLE edge_detection_lapse` + its indexes |
| `V0033+` | — | reserved for EDGE additive changes (the `V0032` additive slot is now consumed by ADR-005) |

> **Flyway note (ADR-005):** the detection-state + lapse change is additive and lands in the
> **reserved `V0032`** slot — inside EDGE's `V0030`–`V0032` block, not an extension of it. The
> additive reservation now rolls forward to `V0033+`. The `ALTER`/`CREATE` are per-tenant (the
> template MIG applies to every `t_<tenantId>`); no global or data backfill is needed (new columns
> are nullable, `UNKNOWN`-defaulting at the application layer, INV-EDGE-9).

Per-tenant scripts are applied by MIG to each `t_<tenantId>` schema at onboarding and on subsequent
migration runs (the same mechanism ACS/PAT rely on). The global script must apply before any
per-tenant script so `pgcrypto` exists.

#### Reserved-range registry (cross-service snapshot)

| Service | Reserved range | Source |
|---|---|---|
| ACS (`acs-service`) | `V0010`–`V0012` | `../../acs-service/contracts/data-model.md` §5 |
| PAT (`pat-service`) | `V0020`–`V0022` | `../../pat-service/contracts/data-model.md` §5 |
| **EDGE (`edge-service`)** | **`V0030`–`V0032`** | this document |
| (future services) | `V0040`+ in `+10` blocks per service | PAT §5 convention |

EDGE's `V0030`–`V0032` does **not** collide with ACS (`V0010`–`V0012`) or PAT (`V0020`–`V0022`).
**Resolved: EDGE reserves `V0030`–`V0032`.** The backlog should add a `MIG` issue to promote this
snapshot into the MIG service docs once MIG is architected.

---

## 6. Data lifecycle

- **Pairing codes** are ephemeral: created on enroll, consumed on claim, expired by TTL; a swept job
  purges `expired`/`consumed` rows (no retention value, reduces the global footprint).
- **Cached catalogs** are derived, not source-of-truth: rebuilt by a fresh PAT pull; retained per
  paired device; dropped on unpair/revoke.
- **Revocation entries** are retained for `revoked`/`unpaired` devices so a leaked token keeps failing
  introspection; `rotate` entries (superseded credentials from reactivation) are also retained.
- **Devices** are soft-stated: `deactivate` and `revoke` retain the row for audit; `revoke` is
  terminal (INV-EDGE-6). No hard delete in the MVP so the HIST trail keeps resolving historical
  references by `device_id`.
- **Detection-lapse episodes** are retained: an episode row is opened by the sweep, closed on
  recovery (`resolved_at`), and kept for the HIST/EVNT audit trail; at most one is open per device
  (INV-EDGE-10). `detection_state`/`last_detecting_at` on `edge_device` always reflect the **latest**
  heartbeat.

EARS — persistence constraints:

- IF an insert into `edge_device`, `cached_catalog`, `edge_detection_lapse` or `device_pairing_code` omits `tenant_id`, THEN THE SYSTEM SHALL reject it (`NOT NULL`, INV-EDGE-1).
- IF `edge_device.connectivity` is non-null while `lifecycle_state <> 'paired'`, THEN THE SYSTEM SHALL reject it (`chk_edge_device_connectivity_paired`, doc 03).
- IF a second live pairing code is inserted for a device that already has one, THEN THE SYSTEM SHALL reject it (`UNIQUE (device_id)` on `device_pairing_code`).
- IF a token presents a `credential_id` present in `edge_credential_revocation`, THEN THE SYSTEM SHALL treat the credential as dead (introspection `active:false`, heartbeat `401` — INV-EDGE-6).
- IF `edge_device.detection_state` is set to a value outside `RUNNING|PAUSED|DEGRADED|UNAVAILABLE|UNKNOWN`, THEN THE SYSTEM SHALL reject it (`chk_edge_device_detection_state`, INV-EDGE-9).
- IF a second **open** detection-lapse row is inserted for a device that already has one, THEN THE SYSTEM SHALL reject it (`uq_edge_detection_lapse_open`, INV-EDGE-10).
