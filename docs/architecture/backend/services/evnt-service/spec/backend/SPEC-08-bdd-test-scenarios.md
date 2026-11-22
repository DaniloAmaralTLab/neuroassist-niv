# SPEC-08 — BDD Test Scenarios

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> Executable features: [`../../tests/cucumber/`](../../tests/cucumber/) (`.feature`, Gherkin only).

## Objective

Map the EARS acceptance criteria to executable Gherkin and document reusable steps and example data.

## Feature files

| Feature | Covers | Source SPEC / EARS |
|---|---|---|
| `gesture-report-ingestion.feature` | ingest, snapshot, idempotency, degrade, forgery | SPEC-02, api §2.1 |
| `alarm-delivery-polling.feature` | active-alarm polling, interval, persistence until confirm, safety limits | SPEC-03, api §3.1/§4.1 |
| `event-read-scoping.feature` | tenant + ACS-link scoping, 404 anti-enumeration | SPEC-06, api §3 |
| `feedback-recording.feature` | real/false_positive, idempotent verdict | api §5.1, SPEC-05 |
| `out-of-band-escalation.feature` | escalation tiers (push→SMS→voice), stop-on-confirm, provider-failure fallback, idempotency | SPEC-11 (ESC-1..ESC-7), ADR-005, api §3.4/§6 |

## Reusable steps (do not list in `.feature`; shared step defs)

- `Given a valid edge.device token for device <D>, patient <P>, tenant <T> carrying evnt.event.ingest`
- `Given a caregiver token for <C> in tenant <T> linked to patient <P>`
- `Given PAT resolves command <CMD> as urgency <U> label <L>`
- `Given PAT is unavailable`
- `Given caregiver <C> has an active push subscription <S>` / `Given caregiver <C> has phone <PH> from ACS with consent`
- `Given emergency event <E> for patient <P> has been unconfirmed for <N> s`
- `When the escalation sweep runs` / `Then a Tier <n> <channel> attempt to <target> is recorded with status <status>`
- `When the station reports <CMD> with reportId <R> at <TS>`
- `Then the response is <STATUS>` / `Then an <ACTION> audit is recorded` / `Then no audit is recorded`

## Example data

| Command | urgency | label |
|---|---|---|
| `cmd-water` | emergency | water |
| `cmd-light` | routine | light |

## Acceptance criteria (EARS)

- THE SYSTEM SHALL have at least one executable scenario for every EARS clause marked testable in SPEC-02, SPEC-03, SPEC-05, SPEC-06 and SPEC-11.
- WHEN the BDD suite runs, THE SYSTEM SHALL cover the ingest-idempotency, active-alarm-persistence, read-scoping-404, confirm-idempotency and escalation (tiers / stop-on-confirm / provider-failure / idempotency) paths.
