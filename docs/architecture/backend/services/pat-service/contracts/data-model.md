# PAT — Data Model

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
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

Mirrors ACS (`../../acs-service/contracts/data-model.md`) for a uniform generator contract:

- **PK strategy:** UUID, `DEFAULT gen_random_uuid()` (`pgcrypto`). Columns typed `uuid`.
- **Timestamps:** `timestamptz`, `DEFAULT now()`; `created_at` on every table, `updated_at`
  where the row mutates.
- **Soft-delete / lifecycle:** no hard deletes for `patient` (`active`/`inactive`) or
  `command` (`active`/`retired`); rows are retained so HIST audit entries and historical
  EVNT `Event` rows keep resolving their `patient_id` / `command_id` references.
  `gesture_type` is append-only in the MVP.
- **Enums:** stored as `varchar` + `CHECK` (portable, generator-friendly), not native PG enums.
- **Encoding:** UTF-8; identifiers snake_case.
- **Tenant isolation:** `patient` and `command` physically live in schema `t_<tenantId>`;
  the `tenant_id` column is retained and `NOT NULL` for defence-in-depth and cross-schema
  audit joins (INV-PAT-1).
- **Cross-boundary references:** `device_id` → EDGE and `created_by` → ACS `Caregiver` are
  **id-only, no FK across the service boundary**. `primary_primitive_id` /
  `secondary_primitive_id` → global `gesture_type` carry **no FK across the schema
  boundary** either (validated at the application layer — §2.3 / SPEC-04, G2). The only
  foreign key is `command.patient_id → patient` (same per-tenant schema).

---

## 2. Entities

### 2.0 Extensions

```sql
-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2.1 `gesture_type` [global]

The PAT-owned global catalog of facial-movement **primitives** — the shared vocabulary
every command composes from. Global because the vocabulary is tenant-independent and must
be readable before any tenant data exists, to author a command (ADR-002). Seeded and
append-only in the MVP: removing a primitive would orphan commands that reference it, so
retirement of a primitive is a future decision (doc 05 data lifecycle). A `GestureType` is
a **name in the vocabulary only** — it does not assert detection-engine support, which GEST
owns (INV-PAT-6).

```sql
-- schema: global
CREATE TABLE gesture_type (
    id           uuid         NOT NULL DEFAULT gen_random_uuid(),
    code         varchar(48)  NOT NULL,
    display_name varchar(80)  NOT NULL,
    description  varchar(255) NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (code)
);
CREATE INDEX idx_gesture_type_code ON gesture_type (code);
COMMENT ON TABLE gesture_type IS 'PAT-owned global primitive vocabulary (ADR-002); code globally unique; append-only in MVP; a name only, not an assertion of engine support (INV-PAT-6).';

-- Seed: initial primitive vocabulary (append-only; codes are stable keys).
INSERT INTO gesture_type (code, display_name, description) VALUES
  ('BLINK',         'Blink',             'A single deliberate eyelid closure.'),
  ('DOUBLE_BLINK',  'Double blink',      'Two deliberate eyelid closures in quick succession.'),
  ('EYEBROW_RAISE', 'Eyebrow raise',     'Raising the eyebrows and holding briefly.'),
  ('LOOK_LEFT',     'Look left',         'Directing the gaze to the left.'),
  ('LOOK_RIGHT',    'Look right',        'Directing the gaze to the right.'),
  ('LOOK_UP',       'Look up',           'Directing the gaze upward.'),
  ('MOUTH_OPEN',    'Mouth open',        'Opening the mouth and holding briefly.'),
  ('SMILE',         'Smile',             'A deliberate smile.')
ON CONFLICT (code) DO NOTHING;
```

**Invariants:** `code` globally unique; append-only (MVP). INV-PAT-6 (name ≠ engine support).

### 2.2 `patient` [tenant]

The assisted person. PAT-owned aggregate root, tenant-scoped (INV-PAT-1). Soft lifecycle:
`active` ⇄ `inactive` (reactivatable; row retained). `device_id` is a nullable opaque
reference to an EDGE device (a patient may exist before a device is paired — A5).

```sql
-- schema: tenant
CREATE TABLE patient (
    id          uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id   uuid         NOT NULL,
    label       varchar(120) NOT NULL,
    device_id   uuid         NULL,
    status      varchar(16)  NOT NULL DEFAULT 'active',
    created_by  uuid         NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_patient_status CHECK (status IN ('active', 'inactive'))
);
CREATE INDEX idx_patient_tenant ON patient (tenant_id);
COMMENT ON TABLE patient IS 'Assisted person; tenant-scoped (INV-PAT-1); soft active/inactive, never hard-deleted; device_id opaque ref to EDGE (no FK).';
```

**Invariants:** INV-PAT-1 (`tenant_id NOT NULL`, from JWT claim only). `device_id` is an
opaque reference (no cross-service FK — A5). `created_by` references an ACS `Caregiver` by
id (no FK across the service boundary).

### 2.3 `command` [tenant]

A catalog item mapping a facial gesture (simple or compound) to a family-defined need,
with its own calibration. PAT-owned aggregate root; belongs to exactly one `patient` of the
**same** tenant (INV-PAT-2). Soft lifecycle: `active` → `retired` (terminal; row retained —
INV-PAT-5).

```sql
-- schema: tenant
CREATE TABLE command (
    id                   uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id            uuid         NOT NULL,
    patient_id           uuid         NOT NULL,
    label                varchar(120) NOT NULL,
    urgency              varchar(16)  NOT NULL,
    sensitivity          varchar(8)   NOT NULL,
    primary_primitive_id   uuid       NOT NULL,
    secondary_primitive_id uuid       NULL,
    min_gesture_time_ms  integer      NOT NULL,
    max_gesture_time_ms  integer      NOT NULL,
    status               varchar(16)  NOT NULL DEFAULT 'active',
    created_by           uuid         NOT NULL,
    created_at           timestamptz  NOT NULL DEFAULT now(),
    updated_at           timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_command_urgency     CHECK (urgency IN ('emergency', 'routine')),
    CONSTRAINT chk_command_sensitivity CHECK (sensitivity IN ('low', 'medium', 'high')),
    CONSTRAINT chk_command_status      CHECK (status IN ('active', 'retired')),
    CONSTRAINT chk_command_window
        CHECK (min_gesture_time_ms > 0 AND max_gesture_time_ms >= min_gesture_time_ms),
    CONSTRAINT chk_command_distinct_primitives
        CHECK (secondary_primitive_id IS NULL OR secondary_primitive_id <> primary_primitive_id),
    FOREIGN KEY (patient_id) REFERENCES patient (id)
);
CREATE INDEX idx_command_patient_status ON command (patient_id, status);
CREATE INDEX idx_command_tenant         ON command (tenant_id);
COMMENT ON TABLE command IS 'Gesture->need command with per-command calibration (ADR-003); belongs to one patient same tenant (INV-PAT-2); soft active/retired (INV-PAT-5); primitive ids validated at application layer, no cross-schema FK to gesture_type (G2).';
```

**Invariants:**

- INV-PAT-2 — `patient_id` references a `patient` of the **same** tenant schema
  (same-schema FK); cross-tenant access returns `404`.
- INV-PAT-3 — `chk_command_window` enforces `min > 0 AND max >= min`.
- INV-PAT-4 — `chk_command_distinct_primitives` enforces a distinct secondary;
  **existence** of `primary_primitive_id` / `secondary_primitive_id` in global
  `gesture_type` is enforced at the **application layer** (a `GestureType` lookup in the
  create/calibrate use case), because the primitive catalog lives in another schema and a
  cross-schema FK is not carried (§G2 decision below).
- INV-PAT-5 — `retired` is terminal; enforced by the use case (no transition out of
  `retired`), the CHECK constrains the value set.

#### G2 decision — no cross-schema FK to `gesture_type`

`command` lives in `t_<tenantId>`; `gesture_type` lives in `neuroassist_global`. A per-tenant
template that carried a FK into the global schema would couple each tenant-schema apply to
the presence and name of `neuroassist_global` at apply time and to `search_path` ordering in
the central MIG runner — exactly the fragility doc 06 G2 flagged. We therefore **do not
declare a cross-schema FK**; `primary_primitive_id` / `secondary_primitive_id` are validated
against `gesture_type` at the **application layer** (INV-PAT-4), mirroring ACS's precedent of
no FK across a boundary (`caregiver_patient_link.patient_id` → PAT). The `gesture_type`
catalog is append-only in the MVP, so a validated reference cannot later dangle. **Resolved:
application-layer validation, no cross-schema FK.**

---

## 3. Relations (ASCII)

```
[gesture_type] (global, PAT-owned)
      ▲  ▲
      │  │  primary_primitive_id / secondary_primitive_id  (id-only, app-layer validated, NO FK — G2)
      │  │
[command] (tenant) *───1 patient_id──> [patient] (tenant)   (same-schema FK)
                                            │
                                            └── device_id ──> (EDGE) device_id by reference (no FK)
                                            └── created_by ──> (ACS) caregiver id by reference (no FK)

command.id  <── referenced by id (no FK) ── (EVNT) Event.command_id, (HIST) audit subjectId
patient.id  <── referenced by id (no FK) ── (ACS) caregiver_patient_link.patient_id, (EDGE), (CONV)
```

---

## 4. Schema-level mapping

| Table | Schema | Tier |
|---|---|---|
| `gesture_type` | `neuroassist_global` | global |
| `patient` | `t_<tenantId>` | per-tenant |
| `command` | `t_<tenantId>` | per-tenant |

---

## 5. Migration plan (reserved ranges)

Flyway scripts authored by PAT, applied centrally by MIG. Reserved ranges keep PAT
migrations collision-free within the shared migrator.

| Range | Schema target | Content |
|---|---|---|
| `V0020__pat_global_init.sql` | global | `pgcrypto` (idempotent), `gesture_type` + seed primitives |
| `V0021__pat_tenant_init.sql` | per-tenant template | `patient`, `command` + CHECKs / indexes |
| `V0022+` | — | reserved for PAT additive changes |

Per-tenant scripts are applied by MIG to each `t_<tenantId>` schema at onboarding and on
subsequent migration runs (the same mechanism ACS relies on). The global script must apply
before any per-tenant script so the vocabulary exists when a command is first authored.

#### G1 decision — reserved-range registry (cross-service snapshot)

doc 06 G1 asked that PAT's proposed `V0020+` be confirmed against the authoritative
reserved-range list. No standalone central registry document exists yet in the MIG service
tree (MIG is declared, not yet architected); the authoritative snapshot of ranges already
claimed by architected services is:

| Service | Reserved range | Source |
|---|---|---|
| ACS (`acs-service`) | `V0010`–`V0012` | `../../acs-service/contracts/data-model.md` §5 |
| **PAT (`pat-service`)** | **`V0020`–`V0022`** | this document |
| (future services) | `V0030`+ in `+10` blocks per service | convention below |

PAT's `V0020`–`V0022` does **not** collide with ACS's `V0010`–`V0012`. **Resolved: PAT
reserves `V0020`–`V0022`.** Convention for the central MIG registry (to be formalized when
MIG is architected): one `+10` block per service, assigned in service-onboarding order;
this table is the current snapshot and the backlog should add a `MIG` issue to promote it
into the MIG service docs.

---

## 6. Data lifecycle

- **No hard deletes** for `patient` (status `active`/`inactive`) or `command` (status
  `active`/`retired`); rows retained so HIST audit entries and historical EVNT `Event` rows
  keep resolving their `patient_id` / `command_id` references.
- **`gesture_type`** append-only in the MVP (removing a primitive would orphan commands).
- **Retention / LGPD erasure** deferred (internal-network-only — doc 06 G4); erasure must
  later reconcile with HIST immutability and id references held by ACS/EDGE/EVNT/CONV.
- **Hot read path** is `command(patient_id, status)` — the active-catalog pull (ADR-004);
  indexed accordingly.

EARS — persistence constraints:

- IF an insert into `patient` or `command` omits `tenant_id`, THEN THE SYSTEM SHALL reject it (`NOT NULL`, INV-PAT-1).
- IF a `command` insert/update sets `min_gesture_time_ms <= 0` or `max_gesture_time_ms < min_gesture_time_ms`, THEN THE SYSTEM SHALL reject it (`chk_command_window`, INV-PAT-3).
- IF a `command` sets `secondary_primitive_id = primary_primitive_id`, THEN THE SYSTEM SHALL reject it (`chk_command_distinct_primitives`, INV-PAT-4).
- IF a `command` references a `primary_primitive_id` / `secondary_primitive_id` absent from `gesture_type`, THEN THE SYSTEM SHALL reject it at the application layer with `400 unknown-gesture-type` (INV-PAT-4, G2 — no DB FK).
- IF a second `gesture_type` with an existing `code` is inserted, THEN THE SYSTEM SHALL reject it (`UNIQUE (code)`).
