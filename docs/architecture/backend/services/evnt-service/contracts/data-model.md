# EVNT — Data Model

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Multi-tenant, schema-per-tenant (`../../../adr/ADR-003-multi-tenancy.md`). PostgreSQL.
> The `sql` blocks are the **canonical contract** consumed by `be-migration-generator.py` /
> `be-entity-generator.py` → Flyway `V0040..` + JPA entities. EARS guide:
> `../../../standards/ears-notation.md`.

## 1. Conventions

- **PK strategy:** application-assigned `uuid` (v4), never DB serial. No cross-service FKs —
  `patientId`, `commandId`, `deviceId`, `confirmedBy` are **opaque references** owned by PAT / EDGE /
  ACS (doc 05).
- **Timestamps:** `timestamptz`, UTC; `created_at default now()`; business time (`occurred_at`) comes
  from the station report, validated (api-contract §2.1).
- **Soft-delete:** none. An event is durable and immutable except the two mutable axes
  (`confirmed_*`, `feedback`) — doc 05 Data Lifecycle.
- **Encoding:** UTF-8; `command_label` is a short family-chosen word (e.g. "water").
- **Schema routing:** the `event` table is **per-tenant** (`t_<tenantId>`). EVNT owns **no** global
  table. The first line of each tenant block carries `-- schema: tenant`.

## 0. Extensions

```sql
-- schema: global
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid() available if DB-side default ever needed
```

## 2. Entities

### 2.1 `event` [tenant]

The single aggregate EVNT owns (ADR-010 shared: one table, no separate "active alarm" entity —
INV-EVNT-3). One row per recognized gesture; `(device_id, report_id)` is the exactly-once guard
(INV-EVNT-4). `urgency` + `command_label` are **snapshots** captured from PAT at generation and are
never rewritten by a later PAT recalibration (INV-EVNT-2, ADR-004 local). `report_meta` carries the
optional, non-authoritative `confidence` / `recognitionWindowMs` for later tuning (api-contract §9).

```sql
-- schema: tenant
CREATE TABLE event (
    id             uuid        NOT NULL,
    tenant_id      uuid        NOT NULL,
    patient_id     uuid        NOT NULL,
    command_id     uuid        NOT NULL,
    command_label  text        NOT NULL,
    urgency        text        NOT NULL,
    device_id      uuid        NOT NULL,
    report_id      text        NOT NULL,
    occurred_at    timestamptz NOT NULL,
    confirmed_at   timestamptz NULL,
    confirmed_by   uuid        NULL,
    feedback       text        NOT NULL DEFAULT 'not_evaluated',
    report_meta    jsonb       NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uq_event_device_report UNIQUE (device_id, report_id),
    CONSTRAINT ck_event_urgency  CHECK (urgency IN ('emergency', 'routine')),
    CONSTRAINT ck_event_feedback CHECK (feedback IN ('not_evaluated', 'real', 'false_positive')),
    CONSTRAINT ck_event_confirm_pair CHECK (
        (confirmed_at IS NULL AND confirmed_by IS NULL)
        OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)),
    CONSTRAINT ck_event_confirm_emergency CHECK (
        confirmed_at IS NULL OR urgency = 'emergency')
);

-- Active-alarm read-time query (ADR-010; INV-EVNT-3): newest unconfirmed emergency per patient.
CREATE INDEX ix_event_active_alarm ON event (patient_id, occurred_at DESC)
    WHERE urgency = 'emergency' AND confirmed_at IS NULL;

-- History / recent-events read surface.
CREATE INDEX ix_event_patient_time ON event (patient_id, occurred_at DESC);

COMMENT ON TABLE event IS 'EVNT aggregate: one structured event per recognized gesture; active alarm is a read-time query (ADR-010).';
```

**Invariants:** `uq_event_device_report` enforces **INV-EVNT-4** (exactly-once per gesture) at the DB.
`ck_event_confirm_emergency` enforces **INV-EVNT-5** (only an emergency can be confirmed).
`ck_event_confirm_pair` keeps `confirmed_at`/`confirmed_by` set together. `ix_event_active_alarm` is
the partial index that serves "active alarm" without a second table (**INV-EVNT-3**). No
`active_event` table is ever created.

### 2.2 `push_subscription` [tenant]

A caregiver's Web Push (VAPID) subscription — the Tier 0 out-of-band channel (ADR-005 / SPEC-11,
api-contract §6). `endpoint` + the two keys are the browser Push API material; `caregiver_id` is an
opaque ACS ref (no cross-service FK). One active row per `(tenant_id, endpoint)` (idempotent
re-register). Revocation is a soft `revoked_at` so a dead endpoint (push `410 Gone`) is retired
without losing the audit of what existed.

```sql
-- schema: tenant
CREATE TABLE push_subscription (
    id            uuid        NOT NULL,
    tenant_id     uuid        NOT NULL,
    caregiver_id  uuid        NOT NULL,
    endpoint      text        NOT NULL,
    p256dh_key    text        NOT NULL,
    auth_key      text        NOT NULL,
    user_agent    text        NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_used_at  timestamptz NULL,
    revoked_at    timestamptz NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_push_sub_endpoint UNIQUE (tenant_id, endpoint)
);

CREATE INDEX ix_push_sub_caregiver ON push_subscription (tenant_id, caregiver_id)
    WHERE revoked_at IS NULL;
COMMENT ON TABLE push_subscription IS 'Caregiver Web Push (VAPID) subscriptions — Tier 0 out-of-band channel (ADR-005).';
```

**Invariants:** `uq_push_sub_endpoint` makes re-registration idempotent (api §6.1 → `200`). The partial
index serves "the active subscriptions of a caregiver" for the escalation sweep. A `410 Gone` from the
push service sets `revoked_at` (not a hard delete).

### 2.3 `escalation_attempt` [tenant]

One row per out-of-band escalation attempt for an emergency (ADR-005 / SPEC-11). It is the **idempotency
guard** (ESC-4: a tier is attempted at most once per recipient+target) and the local record behind the
`GET .../escalation-attempts` read (api §3.4); every row is also audited to HIST (`EscalationAttempted`,
event-contracts §1.2). `event_id` references the same-schema `event` (within-service FK — allowed; it is
not a cross-service ref).

```sql
-- schema: tenant
CREATE TABLE escalation_attempt (
    id                  uuid        NOT NULL,
    tenant_id           uuid        NOT NULL,
    event_id            uuid        NOT NULL,
    tier                smallint    NOT NULL,
    channel             text        NOT NULL,
    caregiver_id        uuid        NOT NULL,
    channel_target      text        NOT NULL,
    status              text        NOT NULL DEFAULT 'pending',
    attempt_no          smallint    NOT NULL DEFAULT 1,
    provider_message_id text        NULL,
    error_reason        text        NULL,
    scheduled_for       timestamptz NOT NULL,
    attempted_at        timestamptz NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uq_escalation_tier UNIQUE (event_id, tier, caregiver_id, channel_target),
    CONSTRAINT ck_escalation_tier    CHECK (tier IN (0, 1, 2)),
    CONSTRAINT ck_escalation_channel CHECK (channel IN ('web_push', 'sms', 'voice')),
    CONSTRAINT ck_escalation_status  CHECK (status IN ('pending', 'sent', 'failed')),
    CONSTRAINT fk_escalation_event FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE
);

CREATE INDEX ix_escalation_event ON escalation_attempt (event_id, tier);
COMMENT ON TABLE escalation_attempt IS 'Out-of-band escalation attempts (push/sms/voice) per emergency; uq enforces one attempt per tier+target (ESC-4).';
```

**Invariants:** `uq_escalation_tier` enforces **ESC-4** (never duplicate a tier for the same event +
recipient + target) at the DB, so a repeated sweep is a no-op. `ck_escalation_*` pin the tier/channel/
status enums. The within-service FK to `event` keeps attempts consistent with the aggregate.

> **Generalised for detection-lapse (ADR-006 / SPEC-12), see §2.3.1.** The out-of-band escalation
> engine is **reused** for detection-lapse alerts (SPEC-12 LAPSE-4). `escalation_attempt` is therefore
> generalised to reference **either** an `event` (emergency) **or** a `detection_lapse` — additively,
> via an ALTER migration, so SPEC-11's contract is unchanged. Below (§2.3) is the original V0043 shape;
> §2.3.1 is the additive V0045 generalisation.

#### 2.3.1 `escalation_attempt` — generalisation for detection-lapse (ADR-006)

`event_id` becomes nullable and a nullable `lapse_id` (within-service FK to `detection_lapse` §2.4) is
added, with a CHECK that **exactly one** subject is set. A `STORED` generated `subject_id =
COALESCE(event_id, lapse_id)` carries the idempotency guard across both subjects (a `UNIQUE` over a
nullable `event_id` would treat NULLs as distinct and fail to dedupe lapse rows — the generated column
avoids that without requiring `NULLS NOT DISTINCT`). ESC-4 holds for events **and** lapses.

```sql
-- schema: tenant
ALTER TABLE escalation_attempt ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE escalation_attempt ADD COLUMN lapse_id uuid NULL;
ALTER TABLE escalation_attempt
    ADD CONSTRAINT ck_escalation_subject CHECK (
        (event_id IS NOT NULL AND lapse_id IS NULL)
        OR (event_id IS NULL AND lapse_id IS NOT NULL));
ALTER TABLE escalation_attempt
    ADD CONSTRAINT fk_escalation_lapse FOREIGN KEY (lapse_id)
        REFERENCES detection_lapse (id) ON DELETE CASCADE;
-- one non-null subject id for the idempotency guard (events keep event_id; lapses carry lapse_id)
ALTER TABLE escalation_attempt
    ADD COLUMN subject_id uuid GENERATED ALWAYS AS (COALESCE(event_id, lapse_id)) STORED;
ALTER TABLE escalation_attempt DROP CONSTRAINT uq_escalation_tier;
ALTER TABLE escalation_attempt
    ADD CONSTRAINT uq_escalation_tier UNIQUE (subject_id, tier, caregiver_id, channel_target);
```

**Invariants:** `ck_escalation_subject` makes an attempt belong to exactly one subject. The regenerated
`uq_escalation_tier` over `subject_id` keeps **ESC-4** (one attempt per tier+recipient+target) for both
emergencies and detection lapses, so a repeated lapse sweep is a no-op.

### 2.4 `detection_lapse` [tenant]

One row per EDGE-raised detection-lapse **episode** (ADR-006 / SPEC-12): a patient station that is
connected but not detecting (`cause = NOT_RUNNING`) or whose heartbeat stopped (`HEARTBEAT_STOPPED`)
for `N` s. EDGE raises it over a service-client call (api-contract §10); `idempotency_key` is EDGE's
stable per-episode key and the dedup guard (LAPSE-2). The episode is **open** while both `resolved_at`
and `acknowledged_at` are NULL; EDGE's resolve (station back to `RUNNING`) sets `resolved_at`, a linked
caregiver's acknowledgement sets `acknowledged_at`/`acknowledged_by` — either stops escalation
(LAPSE-5). `patient_id`/`device_id` are opaque EDGE refs (no cross-service FK). EDGE-sourced enums are
kept in their UPPERCASE Java-identifier form; the EVNT-owned `status` matches EVNT's lowercase style.

```sql
-- schema: tenant
CREATE TABLE detection_lapse (
    id                uuid        NOT NULL,
    tenant_id         uuid        NOT NULL,
    patient_id        uuid        NOT NULL,
    device_id         uuid        NOT NULL,
    cause             text        NOT NULL,
    detection_state   text        NULL,
    reason            text        NULL,
    last_detecting_at timestamptz NULL,
    lapse_started_at  timestamptz NOT NULL,
    engine_version    text        NULL,
    idempotency_key   text        NOT NULL,
    status            text        NOT NULL DEFAULT 'open',
    acknowledged_at   timestamptz NULL,
    acknowledged_by   uuid        NULL,
    resolved_at       timestamptz NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uq_detection_lapse_idem UNIQUE (tenant_id, idempotency_key),
    CONSTRAINT ck_detection_lapse_cause  CHECK (cause IN ('NOT_RUNNING', 'HEARTBEAT_STOPPED')),
    CONSTRAINT ck_detection_lapse_state  CHECK (
        detection_state IS NULL
        OR detection_state IN ('RUNNING', 'PAUSED', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN')),
    CONSTRAINT ck_detection_lapse_status CHECK (status IN ('open', 'resolved', 'acknowledged')),
    CONSTRAINT ck_detection_lapse_ack_pair CHECK (
        (acknowledged_at IS NULL AND acknowledged_by IS NULL)
        OR (acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL))
);

-- Open-lapse escalation sweep + caregiver "station not detecting" list (LAPSE-3/LAPSE-4/LAPSE-5).
CREATE INDEX ix_detection_lapse_open ON detection_lapse (patient_id, lapse_started_at DESC)
    WHERE resolved_at IS NULL AND acknowledged_at IS NULL;
CREATE INDEX ix_detection_lapse_patient ON detection_lapse (patient_id, lapse_started_at DESC);
COMMENT ON TABLE detection_lapse IS 'EDGE-raised detection-lapse episodes (station connected but not detecting); EVNT owns the alert/escalation (ADR-006 / SAFETY-GEST-1).';
```

**Invariants:** `uq_detection_lapse_idem` makes EDGE's raise idempotent per episode (**LAPSE-2**): a
retried raise returns the existing lapse, never a duplicate episode nor a second escalation start.
`ck_detection_lapse_cause`/`_state`/`_status` pin the enums (valid Java identifiers). The partial index
`ix_detection_lapse_open` keys on the two **authoritative stop signals** (`resolved_at`,
`acknowledged_at`) so the sweep and the open list agree with LAPSE-5 regardless of the denormalised
`status` text.

## 3. Relations (ASCII)

```
   (opaque refs — NO foreign keys, cross-service)
   PAT.command ──commandId/urgency/label(snapshot)─┐
   EDGE.device ──deviceId──────────────────────────┤
   PAT/EDGE.patient ──patientId────────────────────┼──▶  event  (t_<tenantId>)
   ACS.caregiver ──confirmedBy──────────────────────┘        │
                                                             └─ active alarm = query: urgency='emergency' AND confirmed_at IS NULL

   EDGE.device ──deviceId──▶ detection_lapse (t_<tenantId>)   escalation_attempt.subject = event_id XOR lapse_id
                             │  open = resolved_at IS NULL AND acknowledged_at IS NULL (ADR-006)
                             └─ escalation reuses the SPEC-11 engine over the open lapse (LAPSE-4)
```

## 4. Migration plan (Flyway range — reserved with MIG)

EVNT authors Flyway scripts; MIG (`neuroassist-niv-migrations`) applies them centrally to
`neuroassist_global` and each `t_<tenantId>` schema template + new-tenant provisioning (doc 05; no
per-service runner). **Reserved range: `V0040`–`V0042`** — the next `+10` block after EDGE
(`V0030`–`V0032`), per the EDGE §5 "+10 per service" convention (ACS `V0010`–`V0012`, PAT
`V0020`–`V0022`, EDGE `V0030`–`V0032`). This closes the doc 05 / brief §9 TODO. **The reserved block is
extended to `V0040`–`V0046`: ADR-005 / SPEC-11 consumed `V0042`–`V0043` for the two escalation tables,
and ADR-006 / SPEC-12 (SAFETY-GEST-1) consumes the previously-reserved `V0044` guard for
`detection_lapse` plus `V0045` for the additive `escalation_attempt` generalisation; `V0046` is the new
reserved guard. The next service block still starts at `V0050` (+10), so no range collision.**

| Version | Scope | Content |
|---|---|---|
| `V0040__evnt_extensions.sql` | global | `pgcrypto` extension (§0) |
| `V0041__evnt_event_table.sql` | tenant | `event` table + constraints + indexes (§2.1) |
| `V0042__evnt_push_subscription_table.sql` | tenant | `push_subscription` table + index (§2.2) — ADR-005 |
| `V0043__evnt_escalation_attempt_table.sql` | tenant | `escalation_attempt` table + UNIQUE/FK + index (§2.3) — ADR-005 |
| `V0044__evnt_detection_lapse_table.sql` | tenant | `detection_lapse` table + UNIQUE/checks + indexes (§2.4) — ADR-006 |
| `V0045__evnt_escalation_attempt_generalise.sql` | tenant | ALTER `escalation_attempt`: nullable `event_id` + `lapse_id` FK + one-subject CHECK + `subject_id` generated + regenerated UNIQUE (§2.3.1) — ADR-006 |
| `V0046__evnt_reserved_guard.sql` | tenant | reserved — no-op placeholder kept so the range is claimed |

EARS — constraints:

- IF an insert would duplicate `(device_id, report_id)`, THEN THE SYSTEM SHALL reject it at the DB and the application SHALL resolve to the idempotent `200` replay (INV-EVNT-4, SPEC-05).
- IF a row would set `confirmed_at` on a `routine` event, THEN THE SYSTEM SHALL reject it (`ck_event_confirm_emergency`; the API returns `409 not-confirmable` before the write — INV-EVNT-5).
- IF `urgency` or `feedback` is outside its enum, THEN THE SYSTEM SHALL reject the row (`ck_event_urgency` / `ck_event_feedback`).
- IF a second subscription would duplicate `(tenant_id, endpoint)`, THEN THE SYSTEM SHALL reject it and the application SHALL resolve to the idempotent `200` re-register (`uq_push_sub_endpoint`, api §6.1).
- IF an escalation sweep would insert a second attempt for the same `(subject_id, tier, caregiver_id, channel_target)` — for an emergency `event` or a `detection_lapse` alike, THEN THE SYSTEM SHALL reject it so the tier is attempted at most once (`uq_escalation_tier` over the generated `subject_id`, ESC-4 / SPEC-11 / LAPSE-4).
- IF an `escalation_attempt` row would set both or neither of `event_id`/`lapse_id`, THEN THE SYSTEM SHALL reject it (`ck_escalation_subject`, ADR-006).
- IF `tier`, `channel` or `status` is outside its enum, THEN THE SYSTEM SHALL reject the escalation row (`ck_escalation_*`).
- IF a raise would duplicate `(tenant_id, idempotency_key)`, THEN THE SYSTEM SHALL reject the second `detection_lapse` and the application SHALL return the existing episode (`uq_detection_lapse_idem`, LAPSE-2).
- IF `cause`, `detection_state` or `status` is outside its enum, THEN THE SYSTEM SHALL reject the `detection_lapse` row (`ck_detection_lapse_*`).

## 5. Schema-level mapping

| Table | Schema | Reason |
|---|---|---|
| `event` | `t_<tenantId>` (tenant) | every event belongs to exactly one care unit; tenant routing from JWT claim (INV-EVNT-1) |
| `push_subscription` | `t_<tenantId>` (tenant) | a subscription belongs to a caregiver within one care unit (ADR-005) |
| `escalation_attempt` | `t_<tenantId>` (tenant) | attempts are per-subject (emergency event or detection lapse), within the subject's tenant (ADR-005 / ADR-006) |
| `detection_lapse` | `t_<tenantId>` (tenant) | an EDGE-raised lapse episode belongs to one patient/device within one care unit (ADR-006) |
| — | `neuroassist_global` | EVNT owns no global table (opaque refs only) |
