# SPEC-08 — BDD Test Scenarios

> Gherkin features live in `../../tests/cucumber/*.feature` (pure `.feature`, consumed by
> `be-bdd-generator.py`). This SPEC documents coverage, reusable steps and example data in prose.

## Feature files

| File | Covers |
|---|---|
| `audit-ingest-idempotency.feature` | SPEC-01/02/05, INV-HIST-1/2/3/4 — append, replay, flagging, composite key |
| `envelope-reconciliation-and-placement.feature` | SPEC-02/04, INV-HIST-5, GEST normalization, lapse collision |
| `caregiver-history-read.feature` | SPEC-01/03/06, INV-HIST-6 — timeline, scope, read-only, period |
| `audit-write-failure-policy.feature` | SPEC-06, ADR-005 — clean failure + 36-fact classification |

## Reusable step definitions (shared glue — do not duplicate across features)

- `Given hist-service is running [with an empty audit trail]`
- `Given the producer is authenticated with a valid service-client token`
- `Given a caregiver "{string}" in tenant "{string}" is linked to patient "{string}"`
- `Given a canonical audit envelope with action "{string}" from source "{string}"`
- `When the producer posts the envelope to "{string}"` / `... again`
- `When the caregiver gets "{string}"` / `... with period "{string}"` / `... with query "{string}"`
- `Then the response status is {int}` (and `is 5xx` variant)
- `Then exactly {int} audit record(s) exist(s) for idempotency key "{string}"`
- `Then the response field "{string}" is "{string}"`
- `Then the problem detail type ends with "{string}"`
- `Then the failure policy class is "{string}"`

> **Note (BDD glue, Learning `bdd-duplicate-step-glue`):** the scaffold phase generates
> `steps/*Steps.java` per the above signatures. Do **not** also generate a monolithic
> `HistStepDefs.java` — keep one step per signature to avoid duplicate glue hidden by dry-run.
> Placeholders feeding Cucumber `{string}` are quoted in every step (e.g. `"<action>"`, `"<source>"`).

## Example data

- Producers: `acs-service`, `pat-service`, `edge-service`, `evnt-service`, `gest-service`.
- Tenant: `t-1`; patient `pat-1`; caregiver `cg-1`.
- Collision pair: EDGE `DetectionLapseResolved` (`edge-device`, `dev-9`) vs EVNT
  `DetectionLapseResolved` (`detection-lapse`, `lapse-9`).

## Acceptance criteria (EARS)

- THE test suite SHALL cover every invariant INV-HIST-1..6 at least once.
- THE test suite SHALL assert the failure-policy class for at least one fact per producer.
