# Covers SPEC-01 (API surface), SPEC-02 (append), SPEC-05 (idempotency), INV-HIST-1/2/3/4
Feature: Append-only audit ingest with idempotency

Background:
  Given hist-service is running with an empty audit trail
  And the producer is authenticated with a valid service-client token
  And the request carries header "X-Correlation-Id" set to "corr-abc"

Scenario: First append creates one immutable record
  Given a canonical audit envelope with action "AlarmConfirmed" from source "evnt-service"
  And the envelope has idempotency key "k-001"
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 201
  And the response field "status" is "APPENDED"
  And exactly 1 audit record exists for idempotency key "k-001"

Scenario: Replay of the same idempotency key appends no second record
  Given an audit record already exists for idempotency key "k-001"
  When the producer posts the same envelope to "/hist/audit" again
  Then the response status is 200
  And the response field "replay" is "true"
  And exactly 1 audit record exists for idempotency key "k-001"

Scenario: Unknown action is stored and flagged, never rejected
  Given a canonical audit envelope with action "SomethingBrandNew" from source "pat-service"
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 201
  And the response field "flagged" is "true"

Scenario: Higher payloadVersion is stored and flagged
  Given a canonical audit envelope with action "CommandCalibrated" from source "pat-service"
  And the envelope has payloadVersion 99
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 201
  And the response field "flagged" is "true"

Scenario: Missing mandatory field is rejected
  Given a canonical audit envelope with action "AlarmConfirmed" from source "evnt-service"
  And the envelope omits "subjectType"
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 400
  And the problem detail type ends with "audit-validation"

Scenario Outline: Composite idempotency key is derived from the fact tuple
  Given a canonical audit envelope with action "<action>" from source "<source>"
  And the envelope has subjectType "<subjectType>" and subjectId "<subjectId>"
  And the envelope carries no explicit idempotency key
  When the producer posts the envelope to "/hist/audit"
  And the producer posts the same envelope to "/hist/audit" again
  Then exactly 1 audit record exists for source "<source>" and action "<action>" and subjectId "<subjectId>"

  Examples:
    | source       | action                | subjectType     | subjectId |
    | evnt-service | AlarmConfirmed        | event           | evt-1     |
    | edge-service | DetectionLapseStarted | edge-device     | dev-1     |
    | gest-service | EngineCapabilityDeclared | engine_capability | cap-1  |
