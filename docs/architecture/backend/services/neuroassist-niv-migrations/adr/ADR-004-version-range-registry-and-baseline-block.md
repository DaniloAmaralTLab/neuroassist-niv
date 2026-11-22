<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Flyway version-range registry (authoritative) + MIG baseline block `V0001–V0009`

## Status
aceita

> Note: orchestrator default (recommendation) - revisable by the owner.

## Contexto

Eight services author migrations into one shared Flyway history per schema, and the reserved
blocks exist only as **prose** scattered across each doc 05 / spec (ACS `V0010–V0012`, PAT
`V0020–V0022`, EDGE `V0030–V0032`→`V0033+`, CONV `V0070–V0079`, TRN **proposes** `V0080–V0089`).
PAT explicitly flags this as open **gap G1**: *"the authoritative reserved-range list across
all services must be confirmed with MIG."* EVNT/GEST/HIST have **no numbered block** on disk.
Separately, something must own the **baseline** that runs before every module: the required
extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `unaccent`), the `neuroassist_global` schema,
`uuid_generate_v7()`, and the per-tenant template baseline — all preconditions for ACS's
`V0010`.

The orchestrator hint proposed reserving **`V0080–V0089` for MIG**. On disk, **TRN already
proposes `V0080–V0089` for itself** — so taking it would collide, violating the hard rule that
MIG must not collide with the other blocks.

## Decisão

- **MIG owns the authoritative registry table `migration_range_registry`** in
  `neuroassist_global` (block_from, block_to, owner_module, schema_target, description,
  declared_at). It is seeded in the baseline block with every known assignment and is the
  single source of truth that **closes PAT gap G1**. Every module's block is confirmed against
  it before Backlog emits that module's migration issues. (Table name `migration_`-prefixed to
  avoid generic-name collision in the shared schema — Learning pitfall.)
- **MIG reserves the baseline block `V0001–V0009`** — **not** `V0080–V0089`. Rationale: (1)
  `V0080–V0089` is already proposed by TRN, so the hint collides; (2) the baseline *must* run
  before ACS's `V0010`, and extensions + global schema + the registry table are the natural,
  lowest-numbered content — MIG is the only module that can own them. This is a **deliberate
  deviation from the orchestrator hint**, justified by the on-disk TRN collision and the
  "must-not-collide" rule.
- **Open blocks (EVNT/GEST/HIST) are recorded as proposals** following the `+10` convention
  (`V0040–V0049` / `V0050–V0059` / `V0060–V0069`) and **marked unconfirmed** in the registry
  and in doc 05 until each module numbers its block at Specs/Backlog (doc 06 G1).
- **Next-version rule:** a new version is `max(global ∪ tenant schema histories) + 1`;
  `outOfOrder = false` (INV-MIG-4) — a block is a *reservation*, not a license to insert below
  the current max.

## Consequências

- **Positive:** reserved blocks become machine-checkable (`migration_range_registry`) instead
  of prose that drifts; G1 is closed; collisions are caught before apply.
- **Positive:** the baseline has a clear owner and runs first; extensions/global schema exist
  before any module DDL.
- **Negative / trade-off:** MIG's block diverges from the orchestrator hint (`V0080–V0089`),
  which must be communicated so no one re-adds MIG there. Accepted and flagged (doc 05 warning,
  doc 06 R1). TRN's `V0080–V0089` and EVNT/GEST/HIST's numbers still need confirming against
  the registry — tracked as G1.
