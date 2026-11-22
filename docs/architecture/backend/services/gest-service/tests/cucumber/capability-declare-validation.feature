# Covers SPEC-03 (declare validation) + INV-GEST-1, INV-GEST-2, INV-GEST-6 + SPEC-10 (PAT dep).
Feature: Capability declaration validation against PAT vocabulary

Background:
  Given an engine version "1.3.0" is registered and active
  And the admin token carries authority "gest.capability.create"

Scenario: Declaring a code that exists in PAT vocabulary succeeds (INV-GEST-1)
  Given PAT vocabulary contains code "BLINK"
  When the admin declares support "supported" for code "BLINK" on engine "1.3.0"
  Then the response status is 201

Scenario: Declaring a code absent from PAT vocabulary is rejected (INV-GEST-1)
  Given PAT vocabulary does not contain code "WINK_LEFT"
  When the admin declares support "supported" for code "WINK_LEFT" on engine "1.3.0"
  Then the response status is 400
  And the problem type is "gesture-type-code-unknown"
  And no capability row is created

Scenario: Declare fails closed when PAT vocabulary is unavailable
  Given PAT gesture-types endpoint is unavailable
  When the admin declares support "supported" for code "BLINK" on engine "1.3.0"
  Then the response status is 503
  And the problem type is "pat-vocabulary-unavailable"
  And no capability row is created

Scenario: The pair (engineVersion, code) is unique (INV-GEST-2)
  Given code "BLINK" on engine "1.3.0" is "supported"
  When the admin declares support "experimental" for code "BLINK" on engine "1.3.0"
  Then the response status is 200
  And exactly one capability row exists for engine "1.3.0" and code "BLINK"

Scenario: A retired pair is only re-supported by an explicit audited re-declare (INV-GEST-6)
  Given code "BLINK" on engine "1.3.0" is "unsupported"
  And PAT vocabulary contains code "BLINK"
  When the admin declares support "supported" for code "BLINK" on engine "1.3.0"
  Then the response status is 200
  And the capability has supportStatus "supported"
  And an "EngineCapabilityDeclared" audit fact is recorded to HIST

Scenario: The same truth is disclosed regardless of tenant (INV-GEST-3)
  Given code "BLINK" on engine "1.3.0" is "supported"
  When a caller from tenant "A" lists capabilities for engine "1.3.0"
  And a caller from tenant "B" lists capabilities for engine "1.3.0"
  Then both callers receive the same capability rows
