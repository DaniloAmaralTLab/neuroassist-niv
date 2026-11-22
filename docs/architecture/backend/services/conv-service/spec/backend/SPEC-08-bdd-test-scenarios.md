# SPEC-08 — BDD Test Scenarios

> Pure-Gherkin features live in `../../tests/cucumber/*.feature` (the generator filters `*.feature`;
> `.md` is ignored). This file holds the prose: feature index, reusable steps, example-data notes.

## Feature index
| Feature file | Covers | SPEC |
|---|---|---|
| `tree-bundle-read.feature` | `GET /conv/tree`, ETag/304, cold patient, tenant isolation | SPEC-02, SPEC-03 |
| `audio-playback.feature` | `GET /conv/audio/{assetId}`, immutable cache, erased→410 | SPEC-02, SPEC-03 |
| `tree-publish.feature` | `POST /conv/trees`, supersede, dangling-ref 422, hard-502, idempotency | SPEC-02, SPEC-05 |
| `tree-retire-and-erase.feature` | `:retire`, `DELETE audio` crypto-shred, commit+durable-retry | SPEC-06, SPEC-05 |
| `usage-signal.feature` | opt-in record, no free text, opt-out discard, idempotent | SPEC-02, SPEC-05 |

## BDD stub layout (scaffold format — D-532 / bdd-duplicate-step defect)

The `be-bdd-generator.py` MUST produce **scaffold format**, not a monolithic class:

| File | Content |
|---|---|
| `bdd/steps/SharedSteps.java` | All shared/reusable steps listed below |
| `bdd/steps/TreeBundleReadSteps.java` | Steps unique to `tree-bundle-read.feature` |
| `bdd/steps/AudioPlaybackSteps.java` | Steps unique to `audio-playback.feature` |
| `bdd/steps/TreePublishSteps.java` | Steps unique to `tree-publish.feature` |
| `bdd/steps/TreeRetireAndEraseSteps.java` | Steps unique to `tree-retire-and-erase.feature` |
| `bdd/steps/UsageSignalSteps.java` | Steps unique to `usage-signal.feature` |

Do NOT generate a monolithic `ConvStepDefs.java` — this causes `DuplicateStepDefinitionException`
at runtime when the scaffold later adds its own per-feature step files.

### CucumberSpringContext (D-532)

The `CucumberSpringContext` class MUST follow D-532:
- Extends `BaseIntegrationTest` (Testcontainers lifecycle — PostgreSQL container).
- Annotated with `@SpringBootTest` + `@ActiveProfiles("test")`.
- **NOT** the D-215 bdd-profile variant (`@CucumberContextConfiguration` only with no base class).

### Reusable steps (implemented in `SharedSteps.java`)
- `Given a patient-session token for patient {string} in tenant {string}`
- `Given a TRN service-client token for tenant {string}`
- `Given patient {string} has an active tree version {int} with ETag {string}`
- `Given usage logging is opted {word} for patient {string}`
- `When the station GETs the tree with If-None-Match {string}`
- `Then the response status is {int}`
- `Then the response ETag is {string}`

> Scenario Outline placeholders that feed Cucumber `{string}` are **quoted in the step text**
> (`"<placeholder>"`). Examples table values are **plain strings without extra wrapping quotes**
> so the substitution yields exactly one quoted token that `{string}` matches.

## Example-data notes
- ETags are opaque strong validators (`"sha256:..."`); tests assert equality/inequality, not format.
- Audio bytes are stubbed via a fake `AudioAssetPort`; no vendor call is ever made (ADR-005).
- HIST is a stubbed audit sink asserting the canonical envelope + idempotency key (event-contracts §3).

## Acceptance criteria (EARS)
- THE SYSTEM SHALL have at least one Gherkin scenario per endpoint in `api-contract.md` §1 (excluding health).
- THE SYSTEM SHALL cover the hard-502 publish rollback and the commit+durable-retry erasure paths (ADR-006).
- THE SYSTEM SHALL cover the `304` conditional read and the cold-patient `404` (SPEC-03).
