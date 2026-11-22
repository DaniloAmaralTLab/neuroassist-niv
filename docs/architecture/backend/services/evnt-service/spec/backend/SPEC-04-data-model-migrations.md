# SPEC-04 — Data Model & Migrations

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical DDL: [`contracts/data-model.md`](../../contracts/data-model.md).

## Objective

Pin the `event` table, its constraints and the Flyway plan so migrations and JPA entities generate
from one source.

## Scope

- **In:** the per-tenant tables (`event`, `push_subscription`, `escalation_attempt`,
  `detection_lapse`), indexes, enum checks, Flyway range `V0040`–`V0046` (ADR-005 escalation tables +
  ADR-006 detection-lapse table and the additive `escalation_attempt` generalisation).
- **Out:** no global table (EVNT owns none); no `active_event` table (ADR-010).

## Technical decisions

- One aggregate, one table (ADR-010; INV-EVNT-3). Active alarm = partial-index read-time query.
- Exactly-once guard = DB `UNIQUE (device_id, report_id)` (INV-EVNT-4).
- Snapshots `urgency` + `command_label` as columns (INV-EVNT-2, ADR-004).
- **Flyway range reserved with MIG: `V0040`–`V0046`** (the next `+10` block after EDGE `V0030`–`V0032`;
  ACS `V0010`–`V0012`, PAT `V0020`–`V0022`; extended by ADR-005 and ADR-006). The next service block
  still starts at `V0050`, so no collision. Closes the doc 05 / brief §9 TODO. MIG applies centrally.

## Implementation

See `contracts/data-model.md` §2.1 (executable `sql`) and §4 (migration plan). JPA entity `Event`
maps the table; `report_meta` is a `jsonb` column mapped as a nullable value object.

## Edge cases

- Duplicate `(device_id, report_id)` insert → DB rejects → app maps to the `200` replay (SPEC-05).
- Confirm on routine blocked both at the API (`409`) and the DB (`ck_event_confirm_emergency`).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL store events in a per-tenant `event` table in `t_<tenantId>` and own no global table.
- IF an insert duplicates `(device_id, report_id)`, THEN THE SYSTEM SHALL reject it at the DB (INV-EVNT-4).
- IF a row sets `confirmed_at` on a `routine` event, THEN THE SYSTEM SHALL reject it (`ck_event_confirm_emergency`, INV-EVNT-5).
- THE SYSTEM SHALL serve the active-alarm query from the partial index `ix_event_active_alarm` without a second table (INV-EVNT-3).
- THE SYSTEM SHALL claim Flyway versions `V0040`–`V0046` and SHALL NOT collide with ACS/PAT/EDGE ranges (next block `V0050`).
- THE SYSTEM SHALL store a `detection_lapse` per-tenant table idempotent on `(tenant_id, idempotency_key)` and generalise `escalation_attempt` to reference an `event` or a `detection_lapse` (ADR-006, data-model §2.3.1/§2.4).
