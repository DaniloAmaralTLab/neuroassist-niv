# SPEC-08 — BDD test scenarios

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Index the Gherkin feature files and document the reusable step vocabulary and example data,
so `be-bdd-generator.py` and step-definition authors work from one place.

## Escopo

- **In:** feature catalog, shared steps, example fixtures.
- **Out:** the `.feature` files themselves (live under `tests/cucumber/*.feature`, Gherkin
  only — this `.md` is ignored by the generator).

## Feature catalog

| Feature file | Covers | Key invariants |
|---|---|---|
| `caregiver-authentication.feature` | login, tenant resolution, deactivation gate, role→authorities | INV-1, INV-6, INV-7 |
| `patient-session-lifecycle.feature` | provision/revoke anchor actions, idempotency, least-authority | INV-2, INV-3, INV-4 |
| `tenant-isolation-and-authority.feature` | platform-ops onboarding, cross-tenant 404, links, authority matrix | INV-1, INV-5, INV-7 |

## Reusable steps (step vocabulary)

- `Given a tenant "<name>" of type "<family|clinic>" has been onboarded`
- `Given an active caregiver "<user>" with role "<role>" exists in that tenant`
- `Given "<user>" is authenticated with a valid token`
- `Given "<user>" is authenticated with authority "<authority>"`
- `When "<user>" authenticates with a <valid|wrong> password`
- `When the caregiver provisions a session for "<patient>" on "<device>"`
- `When the caregiver revokes that session`
- `Then the response status is <code>`
- `Then the ProblemDetail type is "<slug>"`
- `Then a "<Action>" action is audited to HIST`

## Example fixtures

- Tenant: `Familia Silva` (`family`), `Clinica Norte` (`clinic`).
- Caregivers: `ana.silva` (`caregiver`), `bia.coord` (`clinic_coordinator`).
- Patient `patient-1`, device `device-1`.
- Service client: `platform-ops` (tenantless, authority `acs.tenant.onboard`).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL keep every executable scenario in a `.feature` file under `tests/cucumber/` (Gherkin only).
- WHEN a feature references an audited action, THE SYSTEM SHALL assert the corresponding HIST audit as a step.
- THE SYSTEM SHALL reuse the step vocabulary above across features to avoid step duplication.
