# Covers SPEC-02 (normalization), SPEC-04 (placement), INV-HIST-5, event-contracts §2/§4/§5
Feature: Envelope reconciliation and tenant-vs-global placement

Background:
  Given hist-service is running with an empty audit trail
  And the producer is authenticated with a valid service-client token
  And the request carries header "X-Correlation-Id" set to "corr-rec"

Scenario: GEST eventType alias is canonicalized to action
  Given a GEST envelope that uses field "eventType" with value "EngineVersionRegistered.v2"
  And the envelope omits "source"
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 201
  And the stored record has action "EngineVersionRegistered"
  And the stored record has payloadVersion 2
  And the stored record has source "gest-service" derived from the service-client identity

Scenario: GEST global fact is stored in the global scope with null tenant
  Given a GEST envelope with action "EngineCapabilityDeclared" and no tenantId
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 201
  And the record is stored in the global schema
  And the stored record has a null tenantId

Scenario: Tenant-scoped fact missing tenantId is rejected
  Given a canonical audit envelope with action "AlarmConfirmed" from source "evnt-service"
  And the envelope omits "tenantId"
  When the producer posts the envelope to "/hist/audit"
  Then the response status is 400
  And the problem detail type ends with "tenant-required"

Scenario: snake_case subjectType is stored verbatim
  Given a GEST envelope with subjectType "engine_capability"
  When the producer posts the envelope to "/hist/audit"
  Then the stored record has subjectType "engine_capability"

Scenario: DetectionLapseResolved from two sources is kept distinct
  Given a canonical audit envelope with action "DetectionLapseResolved" from source "edge-service"
  And the envelope has subjectType "edge-device" and subjectId "dev-9"
  And a canonical audit envelope with action "DetectionLapseResolved" from source "evnt-service"
  And the second envelope has subjectType "detection-lapse" and subjectId "lapse-9"
  When the producer posts both envelopes to "/hist/audit"
  Then 2 distinct audit records exist for action "DetectionLapseResolved"
  And they are disambiguated by source and subjectType
