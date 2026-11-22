# SPEC-07 — Observability & Health

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`

## Objective

Make EVNT operable: health/readiness, correlation propagation, and the safety-relevant metrics for
an assistive alarm service.

## Scope

- **In:** `GET /evnt/health`, correlation id propagation, structured logs, metrics.
- **Out:** external dashboards (platform concern).

## Technical decisions

- **Health (§7.1):** `200` when ready; readiness reflects **DB** only. PAT/ACS/EDGE/HIST
  reachability is reported as per-dependency detail, not an overall `503` (a hub outage must not take
  EVNT's read surface down — reads are PAT-free by ADR-004).
- **Correlation:** echo inbound `X-Correlation-Id` on every response and every HIST audit; generate
  at GWY if absent.
- **Safety metrics (because this is a life-safety alarm):** emit counters/timers for
  `evnt.ingest.count` (by result), `evnt.ingest.latency`, `evnt.active_alarm.poll.count`,
  `evnt.active_alarm.open.gauge` (currently-unconfirmed emergencies), `evnt.alarm.time_to_confirm`
  (commit → confirm), and `evnt.pat.unavailable.count` (fail-closed ingests). The open-alarm gauge
  and time-to-confirm are the operational proxy for the SPEC-03 safety budget.
- **Escalation metrics (ADR-005 / SPEC-11):** emit `evnt.escalation.attempt.count` tagged by
  `tier` (0/1/2), `channel` (web_push/sms/voice) and `status` (sent/failed), `evnt.escalation.failed.count`
  tagged by `reason` (no-subscription/no-contact/no-consent/provider-error/channel-disabled), and
  `evnt.escalation.tier_reached.gauge` (highest tier an open emergency has reached). A rising
  failed-count on a telephony tier is the signal that provisioning/consent (SPEC-03 residual) needs
  attention — it must be observable, never silent.

## Edge cases

- DB down → `/evnt/health` `503`; hub down → `/evnt/health` `200` with a degraded dependency detail.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL respond `200` on `GET /evnt/health` while the DB is reachable, and `503` when it is not.
- WHILE a hub dependency (PAT/ACS/EDGE/HIST) is unreachable, THE SYSTEM SHALL still report `/evnt/health` `200` with that dependency marked degraded (reads are PAT-free).
- THE SYSTEM SHALL echo `X-Correlation-Id` on every response and every downstream call.
- THE SYSTEM SHALL emit an `open-alarm` gauge and a `time-to-confirm` timer so unacknowledged emergencies are observable (SPEC-03 SAFETY-2 proxy).
- WHEN an escalation attempt completes, THE SYSTEM SHALL increment `evnt.escalation.attempt.count` tagged by tier/channel/status so out-of-band delivery is observable (SPEC-11 ESC-7).
- WHILE a telephony tier is failing (no-contact / provider-error / channel-disabled), THE SYSTEM SHALL surface it via `evnt.escalation.failed.count` so a provisioning/consent gap is visible, not silent (SPEC-03 residual risk).
