# SPEC-11 — Retention + Data-Subject Erasure

> ADR-006 (accepted: Option B within an Option C frame). Contract: `../../contracts/api-contract.md` §4,
> `../../contracts/data-model.md` §2.3/§2.4/§6.

## Objective

Honor data-subject erasure duties (LGPD/GDPR) **without** mutating the immutable audit trail, and model
retention policy as config — minimal for MVP.

## Scope

- **In** — operator-triggered crypto-shred of personal payload fields; per-subject key store; retention
  policy table + legal hold.
- **Out** — automated retention sweep (periods TBD with counsel); row deletion (rejected — breaks
  immutability).

## Decisions (ADR-006)

- **Crypto-shred, not delete** — personal payload fields are encrypted under a per-subject key
  (`audit_subject_key`); erasure deletes the key, rendering those fields permanently unreadable, while
  the immutable `AuditRecord` (action, subjectId, actorId, occurredAt, correlationId) is retained
  (ADR-002 holds — the erasure path never touches an audit row).
- **Trigger** — the **ACS / compliance operator** triggers erasure (service-client principal). It is
  **not** caregiver- or FE-facing. Modelled as a dedicated admin endpoint
  `POST /hist/subjects/{subjectId}/erasure` (authority `hist.erasure.create`). An internal application
  command (`RequestSubjectErasure`) backs it so it can also be invoked by an ops job later.
- **Retention** — `audit_retention_policy` per fact class + legal hold; periods **nullable / TBD with
  counsel** (open item, non-blocking). No scheduled sweep in MVP — the table is the seam.
- **Personal fields per fact** — enumerated in `data-model.md` §6 (caregiver contact, patient display
  name, free-form command labels/needs, feedback notes, escalation contact endpoints; GEST = none).

## Edge cases

- Erasure for a subject with no key / no records → `404`.
- Re-erasure of an already-shredded subject → `200` (idempotent).
- Legal hold on a fact class → retention sweep (future) is suspended; crypto-shred on explicit DSR still
  applies unless hold forbids (counsel to confirm).

## Acceptance criteria (EARS)

- WHEN the operator requests erasure for a subject with a live key, THE SYSTEM SHALL crypto-shred (delete
  the key) and respond `202`, retaining the immutable audit rows (ADR-002, ADR-006).
- WHEN erasure is requested for an already-shredded subject, THE SYSTEM SHALL respond `200`.
- IF the caller lacks `hist.erasure.create`, THEN THE SYSTEM SHALL respond `403`.
- THE SYSTEM SHALL never delete an audit row to satisfy erasure (INV-HIST-1).
- WHERE a retention period is unset, THE SYSTEM SHALL retain the record (no sweep) until counsel sets it.
