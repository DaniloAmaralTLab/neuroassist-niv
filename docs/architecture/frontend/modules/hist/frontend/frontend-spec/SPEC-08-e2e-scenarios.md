# SPEC-08 — E2E Scenarios — hist (HIST) Frontend

> The Gherkin scenarios that cover the EARS acceptance criteria of SPEC-01..07. Each `.feature` lives in
> `../e2e/` and uses **English** Gherkin keywords (`Given|When|Then|And|But`, D-566). Scenario Outline
> placeholders that feed a `{string}` step are **quoted** (e.g. `"<authority>"`). The `fe-ears-coverage.py`
> gate matches each acceptance clause to a scenario by domain-noun overlap — no scenario is live UI yet;
> these are the executable contract the promote/scaffold step will wire to Playwright. This file carries
> no acceptance-criteria section (it enumerates scenarios).

## `caregiver-history.feature` — the per-patient read-only timeline (prototype parity)

Covers SPEC-03 states/summary (loading, empty, error, stale, summary scope, in-memory period switch),
SPEC-04 data access (read on open without polling, narrow re-filter, keyset load-more, explicit range,
delegated-feedback refresh), SPEC-05 delegated-feedback RBAC, SPEC-07 range/read/feedback errors.

## `escalation-detection-lapse-trail.feature` — SAFETY-GEST-1 trail (no prototype parity)

Covers SPEC-01 trail-as-section-under-`hist.history.read`, SPEC-03 visual distinctness + masking, SPEC-07
partial-trail degraded failure.

## `hist-access-and-contract.feature` — guards, RBAC, access-layer, authorities, errors

Covers SPEC-01 route guards + no-write route, SPEC-04 access-http-base / adapter default / zero-write port /
JWT tenant, SPEC-05 RBAC + authority-exactness + operator/service-client authority exclusion + audit-console
off, SPEC-07 unauthorized/forbidden/error-mapping.

## Traceability (EARS clause → feature)

| SPEC | EARS theme | Feature |
|---|---|---|
| SPEC-01 | session redirect, read-guard deny, unlinked forbidden, no-write route, trail-as-section | `hist-access-and-contract` + `escalation-detection-lapse-trail` |
| SPEC-03 | loading / empty / error+stale, visual distinctness, masking, summary scope, period re-derive | `caregiver-history` + `escalation-detection-lapse-trail` |
| SPEC-04 | access-http-base, http default, read-no-poll, narrow re-filter, keyset, range, zero-write, refresh, JWT tenant | `caregiver-history` + `hist-access-and-contract` |
| SPEC-05 | surface RBAC, AccessDecisionService, zero-write+delegation, feedback RBAC, authority-exact, operator exclusion, audit-console off | `hist-access-and-contract` + `caregiver-history` |
| SPEC-07 | unauthorized, forbidden, range validation, read-fail stale, partial-trail degraded, feedback-fail, slug mapping | `caregiver-history` + `escalation-detection-lapse-trail` + `hist-access-and-contract` |
