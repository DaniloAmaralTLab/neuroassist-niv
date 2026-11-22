# SPEC-02 — Capability Registry (core orchestration)

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
Specify the one state-changing capability GEST owns: declaring and retiring the support assertion
`(engineVersion, gestureTypeCode) → supportStatus`, and the engine-version lifecycle it keys to.

## Escopo
- **In:** `EngineVersionService` (register, deprecate) and `CapabilityService` (declare, retire),
  plus the read projections feeding `api-contract.md` §2–§3.
- **Out:** validation details against PAT (SPEC-03), persistence DDL (SPEC-04), security (SPEC-06).

## Decisões técnicas
- Local ADR-002 (engine-capability registry) + ADR-003 (global persistence). Two aggregates
  (`EngineVersion`, `EngineCapability`); `SupportStatus` value object.
- Append + soft-retire: no physical delete; retirement is terminal `unsupported` (INV-GEST-6).

## Implementação
- Declare: upsert on `(engine_version_id, gesture_type_code)`; `201` on insert, `200` on status
  change; bump `updated_at`; audit `EngineCapabilityDeclared`.
- Deprecate engine: `active → deprecated` (one-way); keeps existing rows resolvable; blocks new
  declares with `409 engine-version-deprecated`.
- Retire capability: set `unsupported`, retain row, audit `EngineCapabilityRetired`.

## Casos de borda
- Re-declare after retire → explicit audited transition (allowed; INV-GEST-6 bans only *silent*
  re-support).
- Deprecate already-deprecated / retire already-unsupported → idempotent `200`, no duplicate audit.

## Critérios de aceite (EARS)
- WHEN a capability is declared for a new pair, THE SYSTEM SHALL insert it and audit
  `EngineCapabilityDeclared` (anchor).
- THE SYSTEM SHALL keep `(engineVersionId, gestureTypeCode)` unique (INV-GEST-2).
- WHILE an engine version is `deprecated`, THE SYSTEM SHALL reject new declarations against it and
  SHALL keep its existing rows resolvable for reads (INV-GEST, api-contract §2.4).
- THE SYSTEM SHALL never physically delete a registry row (append + soft-retire, INV-GEST-6).
