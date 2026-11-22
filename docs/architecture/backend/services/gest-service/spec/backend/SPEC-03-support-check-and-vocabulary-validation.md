# SPEC-03 — Support-check gate & PAT vocabulary validation (critical sub-feature)

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
Specify the two consumer-critical behaviours: (1) the station's `support-check` "detectable" gate
(INV-GEST-7), and (2) the declare-time validation that a `gestureTypeCode` exists in PAT's global
vocabulary (INV-GEST-1).

## Escopo
- **In:** `POST /gest/capabilities/support-check`; the `GET /pat/gesture-types` validation on declare.
- **Out:** the full read list (SPEC-01), PAT catalog ownership (PAT), compound timing (INT-GEST-PAT-1).

## Decisões técnicas
- The "detectable" gate is a **contract-layer** invariant (INV-GEST-7, declared in `api-contract.md`
  §3.3), not a domain aggregate invariant.
- Declare validation is **fail-closed** (ADR-002/003 advisory registry must never hold an unvalidated
  code).

## Implementação
- support-check: for each code, look up `(engineVersion, code)`; absent → `unknown`;
  `detectable = supportStatus ∈ {supported, experimental}`. Served from the local store only; no PAT
  call. Returns `ETag` keyed by engineVersion + resolved result.
- declare: before persist, call `GestureVocabularyPort.exists(code)` (Feign `GET /pat/gesture-types`,
  cached briefly). Missing → `400 gesture-type-code-unknown`; PAT down → `503
  pat-vocabulary-unavailable`.

## Casos de borda
- Compound command: station ANDs per-code `detectable`; GEST computes no compound result.
- Unknown engineVersion in support-check → all `unknown`, `200` (advisory, not error).
- Large code sets: single round trip; station caches the result.

## Critérios de aceite (EARS)
- WHEN the station calls support-check, THE SYSTEM SHALL return every requested code with its
  `supportStatus` (absent → `unknown`) and `detectable` flag (INV-GEST-7), **without** calling PAT.
- WHEN an admin declares a capability, THE SYSTEM SHALL validate the code against PAT; IF the code is
  absent, THEN THE SYSTEM SHALL respond `400 gesture-type-code-unknown` (INV-GEST-1).
- IF PAT is unreachable at declare, THEN THE SYSTEM SHALL fail closed with `503` and persist nothing.
