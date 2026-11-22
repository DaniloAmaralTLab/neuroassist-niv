# SPEC-04 — Data model and migrations

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical DDL: `../../contracts/data-model.md`. Resolves doc 06 **G1** and **G2**.

## Objetivo

Specify the persistence schema (global + per-tenant) and the centralized Flyway plan so
`be-migration-generator.py` and `be-entity-generator.py` consume an unambiguous contract.

## Escopo

- **In:** three tables (`gesture_type` global; `patient`, `command` per-tenant), schema-per-tenant
  routing, reserved migration ranges (G1), the cross-schema-FK decision (G2), CHECK constraints,
  data lifecycle.
- **Out:** ACS/EDGE schemas (owned elsewhere); LGPD erasure (doc 06 G4, deferred).

## Decisões técnicas

- Schema-per-tenant — `../../../adr/ADR-003-multi-tenancy.md`. Global: `gesture_type`.
  Per-tenant (`t_<tenantId>`): `patient`, `command`.
- UUID PKs (`gen_random_uuid()`), `timestamptz`, enum-as-`varchar`+`CHECK` (data-model §1) —
  identical conventions to ACS for a uniform generator contract.
- **G1 (resolved):** PAT reserves `V0020`–`V0022`; collision-free vs ACS `V0010`–`V0012`.
  Cross-service snapshot in data-model §5; backlog adds a MIG issue to formalize the registry.
- **G2 (resolved):** **no cross-schema FK** from `command.primary/secondary_primitive_id` to
  global `gesture_type`; primitive existence validated at the **application layer** (INV-PAT-4).
  Only FK is `command.patient_id → patient` (same per-tenant schema). Rationale: data-model §2.3.

## Implementação

The `` ```sql `` blocks in `../../contracts/data-model.md` §2 are canonical. Routing is by the
`-- schema:` first-line comment (`global` → `neuroassist_global`; `tenant` → the
`t_<tenantId>` template). Migration ranges: data-model §5. `gesture_type` carries a seed of
the initial primitive vocabulary (`ON CONFLICT (code) DO NOTHING`, re-runnable).

Migration order: `V0020` (global, incl. seed) must apply before `V0021` (per-tenant template),
so the vocabulary exists when a command is first authored.

## Casos de borda

- Per-tenant template applied at tenant onboarding and on subsequent MIG runs (same as ACS).
- `device_id`, `created_by`, `primary/secondary_primitive_id` carry no FK across boundaries.
- `command.patient_id` FK is intra-schema (both in `t_<tenantId>`) and is retained.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL persist `gesture_type` in `neuroassist_global` and `patient`/`command` in `t_<tenantId>` per data-model §4.
- THE SYSTEM SHALL author Flyway scripts in the reserved `V0020`–`V0022` range and SHALL NOT run Flyway at service start (MIG applies centrally).
- IF an insert into `patient` or `command` omits `tenant_id`, THEN THE SYSTEM SHALL reject it (INV-PAT-1).
- IF a `command` violates `chk_command_window` or `chk_command_distinct_primitives`, THEN THE SYSTEM SHALL reject it (INV-PAT-3, INV-PAT-4).
- IF a `command` references a primitive absent from `gesture_type`, THEN THE SYSTEM SHALL reject it at the application layer `400 unknown-gesture-type` (INV-PAT-4, G2 — no DB FK).
- IF a duplicate `gesture_type.code` is inserted, THEN THE SYSTEM SHALL reject it (`UNIQUE`).
