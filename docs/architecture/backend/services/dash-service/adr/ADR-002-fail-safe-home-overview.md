<!-- OUTPUT-SCHEMA
- Status
- Context
- Decision
- Consequences
-->

# ADR-002 — Fail-safe home overview (never a false "all clear")

## Status

aceita — accepted (2026-11-20) — **revisable**. Scope: local to module DASH. Depends on ADR-001 (no backend,
composition happens in `dash-ui`). This is the module's critical-domain decision.

## Context

The home screen's whole purpose is to answer "Is the patient okay?" in under two seconds. That makes
a **false positive** — showing a green "all clear" when the system could not actually verify safety —
the worst possible failure for this assistive, life-safety product. Under ADR-001 the overview is
composed in the browser from four independent reads (EVNT active-alarm + open detection-lapses, EDGE
detection/connectivity, HIST day summary, PAT identity). Any of them can time out, 5xx, or return
data older than a trustworthy freshness window. Each source already fails safe on its own axis (EVNT
polls and advertises `serverTime`/`pollIntervalSeconds`; EDGE records `UNKNOWN` detection state rather
than assuming `RUNNING`; HIST is read-only). The risk is purely in how DASH **combines** them into a
single headline.

## Decision

The composed "okay status" SHALL be **fail-safe**: it resolves to **OKAY only when every contributing
source was read successfully and is within its freshness window, and none signals a problem**. The
rule, independent of whether composition is ever moved server-side:

```
OKAY            iff  EVNT active-alarm read AND activeAlarm == null
                AND  EVNT detection-lapses read AND no OPEN lapse
                AND  EDGE device read AND connectivity == online AND detectionState == RUNNING
                AND  HIST summary read AND fresh
                AND  PAT identity read
NEEDS ATTENTION if   activeAlarm != null  OR  an open detection-lapse  OR  device offline/not-detecting
UNKNOWN         if   ANY source errored, timed out, or is stale  (cannot confirm)  -> shown, never hidden
```

Concretely: silence, error, timeout or staleness on **any** source forces the overall headline to
**UNKNOWN ("cannot confirm — last checked HH:MM")**, and that source's own tile shows its degraded
state. The green "all clear" is reachable only when the full set is read and fresh. A real emergency
(EVNT) always outranks a lapse, and a lapse always outranks a calm headline (EVNT LAPSE-3/LAPSE-6).

## Consequences

Positive:

- A monitoring outage can never masquerade as "patient is fine" — the caregiver sees "cannot confirm"
  and can act, consistent with EVNT's and EDGE's own fail-safe postures.
- Because sources stay independent (ADR-001), a single failed source degrades only its own tile; the
  rest of the screen keeps working.

Negative / trade-offs accepted:

- More frequent "unknown" states under flaky connectivity (accepted: a truthful "cannot confirm" is
  safer than an optimistic green). A concrete per-source freshness threshold must be set in the FE
  specs (doc 06 G4) and tested.
- The rule must be re-asserted if composition ever moves to a BFF (ADR-001 option B): the server would
  then have to apply this exact fail-safe aggregation, and a bug there would be a single dangerous
  point — a further reason the default keeps composition in the client.

Carried to the FE: this invariant (INV-DASH-2 / SAFETY-DASH-1) is implemented and tested in
`dash-ui`; the backend owns none of it because DASH has no backend.
