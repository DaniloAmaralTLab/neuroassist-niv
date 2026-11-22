<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — Audit-write failure policy (DECISION e — SAFETY) · closes the 5 upstream TODO[architect]

## Status
aceita

> User decision 2026-11-20: **Option B** — hard 502 on grant/creation/non-safety paths; access-ending and safety-critical actions (revocation, alarm confirmation, detection-lapse raise/resolve/acknowledge, escalation attempts) commit locally and enqueue a durable, idempotent audit retry. Dev profile log-only. HIST availability SLO >= 99.9% (HA). Closes the five upstream TODO[architect] failure-policy items.
> Refinement 2026-11-20 (orchestrator default, revisable): the never-block set also includes `EventGenerated` (the help request itself) and `CaregiverAuthenticated` (login to attend an alarm) — authoritative per-fact table: contracts/event-contracts.md §3 (20 hard-502 / 16 commit+durable-retry).

## Contexto
Every producer left an identical `TODO[architect]`: **HIST must confirm the failure policy**
for `POST /audit`. The producers currently state:

- **PAT, EDGE, EVNT** — prod: hard `502 audit-unavailable` on the write path (roll back the
  use case); dev profile: log-only degrade.
- **ACS** — a **split** policy: non-access-ending (grant) actions roll back + `502`, but
  **access-ending** actions (`PatientSessionRevoked`, `CaregiverDeactivated`) commit the
  state change and blacklist entry even if audit fails, and enqueue the audit for retry —
  because a revocation must never be blocked by an audit-sink outage (SEC-001).
- **GEST** — references a fail-closed-vs-best-effort note, unresolved.

Because `POST /audit` is in-band and synchronous, **HIST becomes a synchronous dependency
of every write path**: its availability bounds the write availability of the whole
platform (blast radius, doc 06 R1). The policy and the implied availability target must be
reconciled into one, **surfaced for the user**:

- **Option A — hard `502` everywhere.** Strongest audit integrity (no committed action goes
  unrecorded); but a HIST outage stalls *all* writes, including safety-critical revocation.
- **Option B — ACS split generalized.** Hard `502` on grant/creation paths; access-ending
  and safety-critical actions commit + enqueue audit retry (bounded, durable queue) on HIST
  failure. Preserves immediate revocation and alarm handling during a HIST blip at the cost
  of a short "committed-but-not-yet-audited" window.
- **Option C — best-effort everywhere.** Never block the producer; always enqueue. Weakest
  integrity; rejected for a compliance audit trail.

## Decisão
**Recommendation: Option B (generalize ACS's split), with a hard availability target.**
Grant/creation and non-safety actions keep hard `502` (integrity first); access-ending and
safety-critical actions (revocation, alarm confirmation, detection-lapse raise/resolve)
commit locally and enqueue a durable, idempotent audit retry (ADR-003 idempotency makes the
retry safe). Dev profile stays log-only. This implies a **HIST availability SLO at least as
strong as the most critical producer path** (target ≥ 99.9%, HA deployment, fast restart),
because the hard-`502` set still gates most writes. **User decision required**: confirm
Option B vs a strict Option A, and confirm the availability target. Accepting this ADR
**closes the five upstream `TODO[architect]` items**; producers then cite ADR-005 instead
of their local TODO.

## Consequências
- Positive: safety-critical actions (revocation, alarms, lapses) are never blocked by a
  HIST outage; audit integrity preserved for everything else; one project-wide policy.
- Positive: idempotent ingest (ADR-003) makes enqueue-and-retry duplicate-free.
- Negative: a short window where a safety action is committed but not yet audited; needs a
  durable queue and a reconciliation/alert on the backlog.
- Negative: raises HIST's availability obligation (HA, monitoring) — the blast radius is
  explicit and owned.
- Closes: ACS, PAT, EDGE, EVNT, GEST `TODO[architect]` failure-policy items.
