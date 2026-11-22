# SPEC-04 — Data Model + Migrations

> Canonical DDL: `../../contracts/data-model.md`. ADR-002 (immutability), ADR-004 (placement),
> ADR-006 (crypto-shred/retention), shared ADR-003-multi-tenancy.

## Objective

Define the append-only persistence, tenant-vs-global placement, reserved tamper-evidence columns,
crypto-shred key store, retention config, and the Flyway block.

## Scope

- **In** — tables `audit_record` (tenant), `audit_record_global` (global), `audit_subject_key` (tenant),
  `audit_retention_policy` (global), `audit_source` (global); DB grants; Flyway `V0060`–`V0069`.
- **Out** — long-term cold archival (schema does not preclude it).

## Decisions

- **Placement (ADR-004 A)** — tenant-scoped facts in `t_<tenantId>.audit_record`; GEST global facts in
  `neuroassist_global.audit_record_global`.
- **Immutability (ADR-002 A)** — DB grants INSERT/SELECT only on audit tables; no UPDATE/DELETE; hash
  columns (`record_hash`, `prev_hash`) reserved nullable for additive Option B.
- **Crypto-shred (ADR-006)** — per-subject key in `audit_subject_key` (tenant); erasure deletes the key,
  never an audit row. Only table the HIST role may DELETE from.
- **Retention (ADR-006 C frame)** — `audit_retention_policy` per fact class + legal hold; periods
  nullable (open with counsel); no automated sweep in MVP.

## Flyway block

**`V0060`–`V0069`** — next free `+10` after ACS `V0010`–`V0012`, PAT `V0020`–`V0022`, EDGE
`V0030`–`V0032`, EVNT `V0040`–`V0046`, GEST `V0050`–`V0059` (all verified). Scripts: `V0060` audit_record
(tenant), `V0061` audit_subject_key (tenant), `V0062` audit_record_global (global), `V0063`
audit_retention_policy (global), `V0064` audit_source (global); `V0065` additive index
`ix_audit_record_patient_time` for the caregiver-timeline read + period summary (G-HIST-4, data-model
§4/§7); `V0066`–`V0069` reserved. Applied by MIG.

> **Read-model note (G-HIST-1..5).** The caregiver timeline projects structured entry fields
> (`relatedEventId`, `commandId`/`commandLabel`/`urgency`, folded `confirmation`, `channel`/`maskedTarget`,
> enumerated `outcome`) and a first-page `summary` **without new physical columns** — all map to existing
> columns or `payload` JSON paths (data-model §7). `commandLabel`/`maskedTarget` depend on an upstream EVNT
> audit-payload amendment; HIST omits them when absent.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL grant the HIST role only INSERT/SELECT on `audit_record` / `audit_record_global`
  (INV-HIST-1).
- IF any code path attempts UPDATE/DELETE on an audit table, THEN the DB SHALL reject it (grants).
- WHEN a GEST fact is appended, THE SYSTEM SHALL store it in `audit_record_global` with null `tenant_id`
  (INV-HIST-5).
- WHERE crypto-shred is performed, THE SYSTEM SHALL DELETE only from `audit_subject_key` (ADR-006).
- THE SYSTEM SHALL enforce UNIQUE `idempotency_key` on both audit tables (INV-HIST-3).
