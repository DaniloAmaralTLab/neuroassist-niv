# Covers SPEC-02 + api-contract §2.1. INV-EVNT-2/4/6, ADR-002, ADR-004.
Feature: Gesture report ingestion

Background:
  Given a valid edge.device token for device "dev-1", patient "pat-1", tenant "t-1" carrying "evnt.event.ingest"
  And PAT resolves command "cmd-water" as urgency "emergency" label "water"

Scenario: First report generates one event with the command snapshot
  When the station reports "cmd-water" with reportId "r-100" at "2026-11-20T08:14:03Z"
  Then the response status is 201
  And the event has urgency "emergency" and commandLabel "water"
  And an "EventGenerated" audit is recorded

Scenario: Replay of a consumed report is idempotent
  Given the station already reported "cmd-water" with reportId "r-100" at "2026-11-20T08:14:03Z"
  When the station reports "cmd-water" with reportId "r-100" at "2026-11-20T08:14:03Z"
  Then the response status is 200
  And the body is the existing event
  And no audit is recorded

Scenario: Identity is taken from the token, not the body
  When the station reports "cmd-water" with reportId "r-101" and a body patientId "pat-999"
  Then the response status is 201
  And the event patientId is "pat-1"

Scenario: PAT unavailable fails closed and creates no event
  Given PAT is unavailable
  When the station reports "cmd-water" with reportId "r-102" at "2026-11-20T08:14:03Z"
  Then the response status is 503
  And the problem type is "catalog-unavailable"
  And no event is persisted

Scenario: Unknown command in tenant is rejected
  Given PAT has no command "cmd-ghost" in tenant "t-1"
  When the station reports "cmd-ghost" with reportId "r-103" at "2026-11-20T08:14:03Z"
  Then the response status is 404
  And the problem type is "command-not-found"

Scenario: Revoked device token is rejected
  Given EDGE introspection reports device "dev-1" revoked
  When the station reports "cmd-water" with reportId "r-104" at "2026-11-20T08:14:03Z"
  Then the response status is 401

Scenario Outline: occurredAt out of bounds is rejected
  When the station reports "cmd-water" with reportId "<r>" at "<ts>"
  Then the response status is 400
  And the problem type is "occurred-at-out-of-bounds"

  Examples:
    | r     | ts                   |
    | r-200 | 2030-01-01T00:00:00Z |
    | r-201 | 2020-01-01T00:00:00Z |
