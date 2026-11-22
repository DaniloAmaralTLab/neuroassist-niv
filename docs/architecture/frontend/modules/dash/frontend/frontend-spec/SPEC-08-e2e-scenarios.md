# SPEC-08 — E2E Scenarios — dash (DASH) Frontend

> The Gherkin scenario inventory. Each `.feature` lives in `../e2e/` and is the executable mirror of the
> EARS acceptance criteria in SPEC-01/03/04/05/06/07 (the `fe-ears-coverage` gate matches each criterion
> clause to a scenario here). This file lists scenarios only — it declares no new rule (no EARS section).

## 1. Feature files

| Feature file | Covers (SPEC → clauses) | Theme |
|---|---|---|
| `home-overview-composition.feature` | SPEC-01 (routing, no `/dash`, entry), SPEC-04 (compose from public APIs, refresh), SPEC-05 (per-panel authority self-gating), SPEC-03 (shell-provided patient) | the happy path + routing + RBAC |
| `fail-safe-composite-status.feature` | SPEC-03 (loading holds headline, `all_clear` only when all ok+fresh, em-dash KPI), SPEC-04 (freshness per source, stale EVNT/EDGE/HIST) | the fail-safe headline + freshness matrix |
| `detection-lapse-notice.feature` | SPEC-07 (online but not detecting → amber notice, never emergency) | "online but not detecting" |
| `emergency-precedence.feature` | SPEC-07 (defer to EVNT takeover, never style/suppress) | emergency precedence (INV-3) |
| `partial-failure-and-errors.feature` | SPEC-07 (source error degrades headline, device error not offline/blank, HIST error em-dash, partial failure keeps healthy panels, observability/PII), SPEC-04 (compose-only) | partial failure + error handling |
| `entry-and-shell-routing.feature` | SPEC-01 (entry not a DASH route), SPEC-06 (entry promoted as shell route → ACS login; active-patient push) | entry ownership + shell integration |

## 2. Scenario inventory (titles mirror the EARS criterion nouns)

**home-overview-composition.feature**
- Default route after sign-in is the home overview
- Home overview composes only the published module APIs
- Home overview calls no `/dash` endpoint
- Refresh re-reads every composed facade and re-derives status
- Overview scopes to the shell-provided patient with no picker
- Missing `hist.history.read` hides the day-KPI and recent-events panels
- Missing `edge.device.read` hides the device-health panel
- Missing `evnt.event.read` hides the alarm-status and routine-notice panels
- Missing `pat.command.read` hides the command-catalog summary panel
- Permission map uses only composed authorities and no `dash` authority
- Every DASH gate goes through the AccessDecisionService can-check

**fail-safe-composite-status.feature**
- A loading source holds the headline and never shows all clear
- All clear only when every source is ok and fresh
- A failed KPI renders an em dash, never zero
- EVNT alarm source fresh within twice the poll interval
- Stale EVNT alarm poll degrades the headline
- EDGE heartbeat older than sixty seconds marks the device stale (Scenario Outline)
- HIST summary older than sixty seconds is stale

**detection-lapse-notice.feature**
- Online but not detecting shows an amber notice, never emergency

**emergency-precedence.feature**
- DASH defers to the EVNT emergency takeover without styling or suppressing it

**partial-failure-and-errors.feature**
- A composed source error degrades the headline with a reason
- A failed device read shows an error panel, not offline or blank
- A failed history summary shows an em dash, not zero events
- Partial failure keeps the healthy panels rendered
- Composed-read failures report via the correlation id with no PII

**entry-and-shell-routing.feature**
- entry is a shell route, not a DASH route
- entry is promoted as a shell route into the ACS login flow
- authGuard redirects an unauthenticated caregiver from home to the login flow
- dashGuard denies home and redirects to a safe fallback
- Shell pushes the active patient to the composed modules

## 3. Outline placeholders

`fail-safe-composite-status.feature` uses a `Scenario Outline` whose `Examples` placeholders feed the
`{string}` step parameters — `<source>`, `<health>` and `<headline>` (e.g. `| edge | stale | degraded |`),
so one outline proves the per-source → headline degrade matrix for every non-`ok` source.
