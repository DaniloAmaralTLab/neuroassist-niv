# SPEC-04 — Data Model & Migrations

> Canonical DDL: `../../contracts/data-model.md`. EARS guide: `../../../../standards/ears-notation.md`.

## Objective
Persist immutable per-patient tree versions, audio-asset metadata (references only), and opt-in
minimal usage — all tenant-scoped — and own the Flyway block.

## Scope
- **In:** `published_tree`, `tree_version`, `category`, `phrase`, `audio_asset`, `usage_signal`;
  schema-per-tenant; the CONV Flyway block; personal-data marks for crypto-shred.
- **Out:** voice samples / voice model (TRN); audio bytes (blob storage).

## Technical decisions
- ADR-003 multi-tenancy (schema-per-tenant); ADR-005/006 (erasable `voice_model_ref`, crypto-shred).
- Flyway centralized in MIG; CONV ships SQL only (doc 05).

## Implementation
- **Flyway block: CONV owns `V0070–V0079`.** Verified across all modules — ACS `V0010s`, PAT `V0020s`,
  EDGE `V0030s`, EVNT/GEST `V0040–V0059`, HIST `V0060–V0069`; **no module uses `V007x`** (grep of every
  `services/*/contracts/data-model.md` + backend `issues/`, 2026-11-20). Migration list in
  `data-model.md` §4 (`V0070`..`V0077`, `V0078–V0079` reserved).
- Immutability: only `tree_version.status`/`withdrawn_at` and `audio_asset.erased*` transition; all
  other columns are append-only (INV-CONV-1).
- One-active enforced by partial unique index `uq_tree_version_one_active` (INV-CONV-2).

## Edge cases
- Publish referencing a missing manifest asset → rejected before insert (`422`, INV-CONV-3).
- Erasure retains the immutable row; payload rendered unreadable (`erased = true`).

## Acceptance criteria (EARS)
- THE SYSTEM SHALL store every table in the per-tenant `conv` schema and SHALL require a resolved `TenantContext` for every query (INV-CONV-7).
- IF a publish would create a second `active` version for a patient, THEN THE SYSTEM SHALL reject it (partial unique index, INV-CONV-2).
- IF a phrase references an `asset_id` absent from the same version's manifest, THEN THE SYSTEM SHALL reject the publish `422` (INV-CONV-3).
- THE SYSTEM SHALL never update a published `tree_version`'s content in place; a change SHALL be a new version (INV-CONV-1).
- THE SYSTEM SHALL mark `audio_asset.voice_model_ref` as erasable personal data and SHALL render it unreadable on crypto-shred (ADR-005/006).
