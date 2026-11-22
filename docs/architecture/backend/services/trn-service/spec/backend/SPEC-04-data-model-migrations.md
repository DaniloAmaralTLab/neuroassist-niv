# SPEC-04 — Data Model and Migrations

> Canonical DDL: `../../contracts/data-model.md`. Flyway block **V0080–V0089** (MIG-run).
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Pin the persistence model, tenant isolation, the reserved Flyway block and the authority seed, so
`be-migration-generator.py` / `be-entity-generator.py` emit the schema and entities deterministically.

## Scope

**In:** nine tenant tables + the global authority seed, schema routing, migration ordering. **Out:** the
published tree (CONV owns it), blob bytes (storage), the ES index documents (SPEC-10).

## Technical decisions

- Schema-per-tenant (`-- schema: tenant` on all authoring tables); only the `trn.*` authority seed is
  global (`neuroassist_global`). PK UUID (`gen_random_uuid()`), time-ordered where MIG's
  `uuid_generate_v7()` baseline is present. No cross-service FKs — PAT/CONV refs are id-only.
- Extensions (`pgcrypto`, `pg_trgm`) are MIG-baseline; TRN re-declares idempotently.

## Implementation (entities → data-model §)

`training_session` §2.1 · `proposal` §2.2 · `authorization` §2.3 (dual-auth VO, distinctness CHECK) ·
`consent_record` §2.4 (one-active partial unique) · `voice_model` §2.5 · `voice_sample` §2.6 ·
`audio_asset` §2.7 · `publication` §2.8 (idempotency uniques) · `outbound_job` §2.9 (durable-retry).

## Migration plan (V0080–V0089)

`V0080` extensions (global) · `V0081` training_session · `V0082` proposal · `V0083` authorization ·
`V0084` consent_record · `V0085` voice_model+voice_sample · `V0086` audio_asset · `V0087` publication ·
`V0088` outbound_job · `V0089` iam_permissao_trn (global — seeds the 12 `trn.*` codes + model-access
version bump).

> Block verified collision-free on 2026-11-22 (CONV `V0070–V0079`, MIG baseline `V0001–V0009`; MIG doc
> 05 explicitly cedes `V0080–V0089` to TRN). MIG owns the final ordinals — confirm before backlog emits
> migration issues (06 §Gaps).

## Edge cases

- A tenant schema missing the block → MIG applies on tenant onboarding; TRN never runs Flyway itself.
- `audio_asset` erased → row retained with `status='erased'`, refs crypto-shredded (not hard-deleted).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL place every authoring table in the per-tenant `trn` schema and the authority seed in `neuroassist_global` (INV-TRN-8).
- THE SYSTEM SHALL reach `approved` only when `authorization` holds both `caregiver_confirmed_at` and `patient_confirmed_at` with distinct `confirmedBy` (DB `CHECK` + service — INV-TRN-1).
- IF a consent row has `status='granted'`, THEN THE SYSTEM SHALL require both `granted_by_patient` and `granted_by_representative` true (CHECK — INV-TRN-3).
- THE SYSTEM SHALL enforce one publication per approval via the `(tenant_id, approval_id)` and `(tenant_id, idempotency_key)` uniques (INV-TRN-6).
- THE SYSTEM SHALL retain erased voice/audio rows with payload rendered unreadable and SHALL NOT hard-delete governance records (HIST ADR-006).
- THE SYSTEM SHALL carry the `trn.*` authority seed as the exact 12 codes computed by the D-639 verb table (SPEC-06), never invented.
