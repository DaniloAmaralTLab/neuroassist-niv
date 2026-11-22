# SPEC-08 — BDD Test Scenarios

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
Catalogue the executable Gherkin features and the reusable steps / example data behind them.

## Escopo
Executable features live in `../../tests/cucumber/*.feature` (pure Gherkin). This spec holds the prose
that does not belong in a `.feature`: step glossary, data fixtures, coverage map.

## Feature coverage map

| Feature file | Covers | Invariants |
|---|---|---|
| `engine-capability-registry.feature` | declare / re-declare / retire / deprecate / authority | INV-GEST-2, INV-GEST-5, INV-GEST-6 |
| `support-check-detectable-gate.feature` | station support-check, detectable flag, ETag/304, no-PAT | **INV-GEST-7**, INV-GEST-4 |
| `capability-declare-validation.feature` | PAT vocabulary validation, fail-closed, uniqueness, global | INV-GEST-1, INV-GEST-2, INV-GEST-3, INV-GEST-6 |

## Reusable steps (implemented once in step defs)
- `Given an engine version "<v>" is registered and active`
- `Given code "<c>" on engine "<v>" is "<status>"` / `has no declaration`
- `Given PAT vocabulary contains / does not contain code "<c>"`
- `Given the <actor> token carries authority "<auth>"` / `an edge.device token carrying "<auth>"`
- `When the station runs support-check on engine "<v>" for code(s) "<csv>"`
- `Then the result for "<c>" has supportStatus "<s>" / detectable <bool>`
- `Then an "<EventType>" audit fact is recorded to HIST`

## Example data
- Engine versions: `1.3.0` (active), `1.2.0` (deprecated), `9.9.9` (unknown).
- Codes: `BLINK` (supported), `DOUBLE_BLINK` (experimental), `BROW_RAISE` (undeclared → unknown),
  `WINK_LEFT` (absent from PAT vocabulary).

## Critérios de aceite (EARS)
- THE SYSTEM SHALL pass every scenario in the three feature files before the module is considered
  spec-complete.
- WHEN a new endpoint or invariant is added, THE SYSTEM SHALL gain a covering scenario in the matching
  `.feature` file.
