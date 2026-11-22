# SPEC-08 — BDD test scenarios

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Executable features (Gherkin): `../../tests/cucumber/*.feature`.

## Objetivo

Describe the BDD coverage, the reusable step vocabulary and the example data behind the three
`.feature` files, so `be-bdd-generator.py` and the step definitions have a stable reference.

## Escopo

- **In:** the three feature files, the shared step catalog, example fixtures, the SPEC→feature map.
- **Out:** unit tests, ArchUnit layering tests (testing-conventions standard).

## Feature files (Gherkin, `../../tests/cucumber/`)

| File | Covers | Key invariants |
|---|---|---|
| `patient-registration.feature` | SPEC-01, SPEC-02 patient lifecycle | INV-PAT-1, INV-PAT-2, INV-PAT-7 |
| `command-calibration.feature` | SPEC-02 core calibration | INV-PAT-3, INV-PAT-4, INV-PAT-5 |
| `catalog-distribution-and-authority.feature` | SPEC-03 (ADR-004), SPEC-06 | INV-PAT-6, INV-PAT-7 |

## Reusable steps (step-definition catalog)

- `Given a caregiver authenticated with a tenant-scoped ACS JWT for tenant "<t>"`
- `And the caregiver holds authority "<a>"` / `authorities "<a,b,c>"`
- `Given a request bearing a patient-session token with authorities "<set>" only`
- `Given a detection service-client token holding authority "<a>"`
- `Given a patient "<p>" with status "<s>" in tenant "<t>"`
- `And the global gesture-type catalog contains "<code>"...`
- `Given an active command "<c>" on patient "<p>" ...`
- `Then the response status is <n>`
- `And the problem type is "<slug>"`
- `And a "<Action>" action is audited to HIST ...`

## Example fixtures

- Tenants `T1` (caller), `T2` (foreign — isolation checks).
- Primitives `BLINK`, `EYEBROW_RAISE`, `DOUBLE_BLINK`.
- Calibration window valid `(300, 1200)`; invalid `(0,500)`, `(-1,500)`, `(800,300)`.
- Command `C1`: `BLINK` → "suction", `emergency`, `medium`.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL pass every scenario in the three `.feature` files against the built service.
- THE SYSTEM SHALL cover, across the features, each of INV-PAT-1 through INV-PAT-7 with at least one scenario.
- WHEN the suite runs, THE SYSTEM SHALL exercise the patient-session `403` path on both a patient endpoint and a catalog endpoint (INV-PAT-7).
