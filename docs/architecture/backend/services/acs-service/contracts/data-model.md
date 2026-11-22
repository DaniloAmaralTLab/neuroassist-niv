# ACS — Data Model

> Service: `acs-service` · Module **ACS — Caregivers and Access** · Project: NeuroAssist NIV
> Persistence: PostgreSQL via Spring Data JPA · Schema-per-tenant
> (`../../../adr/ADR-003-multi-tenancy.md`) · Migrations authored here, applied
> **centrally** by MIG (`neuroassist-niv-migrations`). EARS guide:
> `../../../standards/ears-notation.md`.

The `` ```sql `` blocks below are the **canonical contract** consumed by
`be-migration-generator.py` (Flyway `V####__*.sql`) and `be-entity-generator.py` (JPA
entities). Each block's first line carries a `-- schema:` routing comment
(`global` → `neuroassist_global`; `tenant` → `t_<tenantId>`).

---

## 1. Conventions

- **PK strategy:** UUID, `DEFAULT gen_random_uuid()` (`pgcrypto`). Columns typed `uuid`.
- **Timestamps:** `timestamptz`, `DEFAULT now()`; `created_at` on every table.
- **Soft-delete / lifecycle:** no hard deletes for `caregiver` and `patient_session`
  (status columns + retained rows — ADR data-lifecycle). `caregiver_patient_link` is the
  only table where rows are physically removed (unlink).
- **Enums:** stored as `varchar` + `CHECK` constraint (portable, generator-friendly), not
  native PG enums.
- **Encoding:** UTF-8; identifiers snake_case.
- **Tenant isolation:** per-tenant tables physically live in schema `t_<tenantId>`; the
  `tenant_id` column is retained and `NOT NULL` for defence-in-depth and cross-schema
  joins during audit (INV-1).

---

## 2. Entities

### 2.0 Extensions

```sql
-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2.1 `tenant` [global]

The care-unit registry — a family (MVP) or clinic. Onboarded exclusively by
`platform-ops` (INV-5). Readable before any tenant context exists, hence global.

```sql
-- schema: global
CREATE TABLE tenant (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    type        varchar(16) NOT NULL,
    name        varchar(160) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_tenant_type CHECK (type IN ('family', 'clinic'))
);
COMMENT ON TABLE tenant IS 'Care unit (family|clinic); onboarded only by platform-ops (INV-5).';
```

**Invariants:** INV-5 (created only via `platform-ops`). The physical `t_<tenantId>`
schema is provisioned by MIG when a row is inserted here.

### 2.2 `caregiver_identity_lookup` [global]

Resolves a login → tenant **before** a tenant context exists (authentication time),
making login resolution deterministic (INV-6). Username is globally unique, which also
enforces "unique within tenant". Holds no business data beyond the routing keys; the
credential and profile live in the per-tenant `caregiver` row.

```sql
-- schema: global
CREATE TABLE caregiver_identity_lookup (
    username     varchar(120) NOT NULL,
    tenant_id    uuid         NOT NULL,
    caregiver_id uuid         NOT NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (username),
    FOREIGN KEY (tenant_id) REFERENCES tenant (id)
);
CREATE INDEX idx_identity_lookup_tenant ON caregiver_identity_lookup (tenant_id);
COMMENT ON TABLE caregiver_identity_lookup IS 'Global login->tenant router (INV-6); resolves authentication before tenant context. Credential lives in per-tenant caregiver. See data-model TODO[architect] on placement reconciliation.';
```

**Invariants:** INV-6 (login unique → deterministic tenant resolution).
**TODO[architect]:** doc 05 flags reconciliation of credential placement (global router
here vs credential fully per-tenant) against the live `acs-service`. This model keeps the
credential per-tenant and only the routing keys global; confirm against production before
scaffold — do not re-decide the invariant, only the physical placement.

### 2.3 `caregiver` [tenant]

The only human actor with a login; belongs to exactly one tenant (INV-1). Credential and
profile. Soft lifecycle: `active` → `deactivated` (terminal; row retained).

```sql
-- schema: tenant
CREATE TABLE caregiver (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     uuid         NOT NULL,
    username      varchar(120) NOT NULL,
    password_hash varchar(255) NOT NULL,
    role          varchar(24)  NOT NULL,
    status        varchar(16)  NOT NULL DEFAULT 'active',
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (tenant_id, username),
    CONSTRAINT chk_caregiver_role   CHECK (role IN ('caregiver', 'clinic_coordinator')),
    CONSTRAINT chk_caregiver_status CHECK (status IN ('active', 'deactivated'))
);
CREATE INDEX idx_caregiver_tenant ON caregiver (tenant_id);
COMMENT ON TABLE caregiver IS 'Human login; tenant-scoped (INV-1); role from RoleAuthorityPolicy; soft-deactivated, never hard-deleted.';
```

**Invariants:** INV-1 (`tenant_id NOT NULL`, no null-tenant path); INV-6 (unique
`(tenant_id, username)`). Deactivation retains the row for audit continuity.

### 2.4 `caregiver_patient_link` [tenant]

The authorization edge binding a caregiver to a patient (owned by PAT, referenced by id)
within the tenant. The only table with physical deletes (unlink).

```sql
-- schema: tenant
CREATE TABLE caregiver_patient_link (
    id           uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    uuid        NOT NULL,
    caregiver_id uuid        NOT NULL,
    patient_id   uuid        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (caregiver_id, patient_id),
    FOREIGN KEY (caregiver_id) REFERENCES caregiver (id)
);
CREATE INDEX idx_link_patient ON caregiver_patient_link (patient_id);
COMMENT ON TABLE caregiver_patient_link IS 'Caregiver->Patient authorization edge; patient_id references PAT by id (no FK across service boundary); unique per (caregiver,patient).';
```

**Invariants:** a link is unique per `(caregiver_id, patient_id)` (idempotent link —
SPEC-05). `patient_id` references the PAT-owned aggregate by id only (no cross-service FK).

### 2.5 `patient_session` [tenant]

The non-expiring, revocable patient-with-session actor (ADR-012 Option C, ADR-003).
Isolated from `caregiver` so the model is reversible by removal (ADR-002). Terminal
`active` → `revoked`; row retained with revocation metadata.

```sql
-- schema: tenant
CREATE TABLE patient_session (
    id             uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id      uuid         NOT NULL,
    patient_id     uuid         NOT NULL,
    device_id      uuid         NOT NULL,
    provisioned_by uuid         NOT NULL,
    token_jti      uuid         NOT NULL,
    status         varchar(16)  NOT NULL DEFAULT 'active',
    revoked_by     uuid         NULL,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    revoked_at     timestamptz  NULL,
    PRIMARY KEY (id),
    UNIQUE (token_jti),
    CONSTRAINT chk_session_status CHECK (status IN ('active', 'revoked')),
    CONSTRAINT chk_session_revoked_consistency
        CHECK ((status = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL)
            OR (status = 'active'  AND revoked_by IS NULL     AND revoked_at IS NULL)),
    FOREIGN KEY (provisioned_by) REFERENCES caregiver (id),
    FOREIGN KEY (revoked_by)     REFERENCES caregiver (id)
);
CREATE INDEX idx_session_patient ON patient_session (patient_id);
CREATE INDEX idx_session_status  ON patient_session (status);
COMMENT ON TABLE patient_session IS 'Non-expiring revocable patient session (ADR-012 C); authorities limited to conv.*/gest.* (INV-3); no expires_at by design (ADR-003).';
```

**Invariants:** INV-2 (one patient, provisioned by a caregiver of the **same** tenant);
INV-3 (session authorities are `conv.*` / `gest.*` only — enforced at issuance, not
stored here); INV-4 (`revoked` is terminal; `chk_session_revoked_consistency` ties
status to revocation metadata). No `expires_at` column (non-expiring by design).

### 2.6 `jwt_blacklist` [global]

The stateless-JWT revocation store, reused for both caregiver and patient-session tokens
(ADR-003, SEC-001). Global so every resource server can check it regardless of tenant.

```sql
-- schema: global
CREATE TABLE jwt_blacklist (
    jti              uuid         NOT NULL,
    reason           varchar(40)  NOT NULL,
    blacklisted_at   timestamptz  NOT NULL DEFAULT now(),
    token_expires_at timestamptz  NULL,
    PRIMARY KEY (jti)
);
CREATE INDEX idx_blacklist_expiry ON jwt_blacklist (token_expires_at);
COMMENT ON TABLE jwt_blacklist IS 'Stateless-JWT revocation store (SEC-001); token_expires_at NULL for non-expiring patient sessions (retained until the token can no longer be presented). Entries prunable after natural expiry.';
```

**Invariants:** a blacklisted `jti` causes immediate `401` (INV-4, api-contract §0.1).
`token_expires_at` is `NULL` for non-expiring patient sessions — such entries are retained
indefinitely (ADR-003 TODO: confirm the existing blacklist supports this lifecycle).

---

## 3. Relations (ASCII)

```
[tenant] (global) 1───* [caregiver_identity_lookup] (global)
   │ 1
   │  (one t_<tenantId> schema per tenant)
   ▼ *
[caregiver] (tenant) 1───* [caregiver_patient_link] (tenant) *───1 (PAT) patient_id
   │ 1                                                         
   │ provisioned_by / revoked_by                              
   ▼ *                                                        
[patient_session] (tenant) ──1 token_jti──* [jwt_blacklist] (global, on revoke)
                           └── device_id ──> (EDGE) device_id by reference
```

Cross-service references (no FK): `patient_id` → PAT; `device_id` → EDGE.

---

## 4. Schema-level mapping

| Table | Schema | Tier |
|---|---|---|
| `tenant` | `neuroassist_global` | global |
| `caregiver_identity_lookup` | `neuroassist_global` | global |
| `jwt_blacklist` | `neuroassist_global` | global |
| `caregiver` | `t_<tenantId>` | per-tenant |
| `caregiver_patient_link` | `t_<tenantId>` | per-tenant |
| `patient_session` | `t_<tenantId>` | per-tenant |

---

## 5. Migration plan (reserved ranges)

Flyway scripts authored by ACS, applied centrally by MIG. Reserved ranges keep ACS
migrations collision-free within the shared migrator.

| Range | Schema target | Content |
|---|---|---|
| `V0010__acs_global_init.sql` | global | `pgcrypto`, `tenant`, `caregiver_identity_lookup`, `jwt_blacklist` |
| `V0011__acs_tenant_init.sql` | per-tenant template | `caregiver`, `caregiver_patient_link`, `patient_session` |
| `V0012+` | — | reserved for ACS additive changes |

Per-tenant scripts are applied by MIG to each `t_<tenantId>` schema at onboarding and on
subsequent migration runs.

EARS — persistence constraints:

- IF an insert into `caregiver` omits `tenant_id`, THEN THE SYSTEM SHALL reject it (`NOT NULL`, INV-1).
- IF a `patient_session` row is set to `status = revoked` without `revoked_by` and `revoked_at`, THEN THE SYSTEM SHALL reject it (`chk_session_revoked_consistency`, INV-4).
- IF a second `caregiver_patient_link` with the same `(caregiver_id, patient_id)` is inserted, THEN THE SYSTEM SHALL reject it (`UNIQUE`).
- IF a second `caregiver_identity_lookup` with an existing `username` is inserted, THEN THE SYSTEM SHALL reject it (`PRIMARY KEY`, INV-6).
