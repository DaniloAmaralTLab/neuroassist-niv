# SPEC-02 — Audit Append Orchestration (core)

> Core use case `AppendAuditRecord`. Anchor domain milestone `AuditRecordAppended`.
> Contracts: `../../contracts/event-contracts.md`, `../../contracts/data-model.md`.

## Objective

Append one immutable audit record per producer fact, normalizing the five producers' divergences into
the canonical shape and routing to the correct storage scope (tenant vs global).

## Scope

- **In** — envelope validation, GEST normalization (alias/version/source/casing), scope routing,
  idempotent upsert, flagging of unknown action / higher version.
- **Out** — producer-side failure handling (SPEC-06 / `event-contracts.md` §3), published messages
  (none — SPEC-09).

## Decisions

- Reconcile, do not re-contract (vision principle 2): an `EnvelopeReconciliationAdapter` in `api` maps
  each producer shape to the canonical `AuditRecord` command; GEST is **tolerated**, not re-scaffolded
  (`event-contracts.md` §2).
- Append-only (ADR-002 Option A): persistence is INSERT-only; immutability enforced by DB grants.
- Scope routing (ADR-004 Option A): tenant-scoped facts → `t_<tenantId>.audit_record`; GEST global facts
  → `neuroassist_global.audit_record_global`.

## Implementation

1. `AuditController.record(envelope)` → `EnvelopeReconciliationAdapter.toCommand(envelope, principal)`:
   - resolve `action` from `action` else `eventType` (strip `.vN` → `payloadVersion`);
   - set `source` from envelope else from the service-client principal;
   - default `payloadVersion = 1`; keep `subjectType` verbatim.
2. `AppendAuditRecord.handle(command)`:
   - validate INV-HIST-2 mandatory fields → `400` on miss;
   - decide scope: `tenantId` present → tenant store (require non-null, else `400 tenant-required`);
     absent + GEST source → global store;
   - compute idempotency key (SPEC-05); upsert via `AuditTrailPort`;
   - flag when `action` unknown or `payloadVersion > knownMax` (INV-HIST-4), never reject;
   - raise in-process `AuditRecordAppended` (no publish).
3. Response `201` new / `200` replay.

## Edge cases

- Unknown action AND missing tenantId for a non-GEST source → still `400 tenant-required` (placement
  first) unless the source is GEST.
- `eventType` present with a `.v2` suffix but `payloadVersion` also present → the explicit
  `payloadVersion` wins; suffix is informational.
- Concurrent duplicate posts of the same key → exactly one row (SPEC-05 concurrency).

## Acceptance criteria (EARS)

- WHEN a valid envelope with a new key arrives, THE SYSTEM SHALL append exactly one immutable record
  (INV-HIST-1).
- WHEN `action` is absent and `eventType` present, THE SYSTEM SHALL canonicalize `eventType` to `action`.
- WHEN an `eventType` carries a `.vN` suffix, THE SYSTEM SHALL set `payloadVersion = N` and strip the
  suffix from `action`.
- WHEN `source` is omitted, THE SYSTEM SHALL derive it from the service-client identity (INV-HIST-2).
- IF `action` is unknown OR `payloadVersion` exceeds the known maximum, THEN THE SYSTEM SHALL store and
  flag the record, responding `201` (INV-HIST-4).
- WHILE the fact is GEST global-schema, THE SYSTEM SHALL route it to the global store with null
  `tenantId` (INV-HIST-5).
