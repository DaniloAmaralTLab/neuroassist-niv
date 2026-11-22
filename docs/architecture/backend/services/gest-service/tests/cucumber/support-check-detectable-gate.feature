# Covers SPEC-01 (api surface) + INV-GEST-7 (the "detectable" gate) + SPEC-06 (station auth).
Feature: Station support-check (the detectable gate)

Background:
  Given an engine version "1.3.0" is registered and active
  And code "BLINK" on engine "1.3.0" is "supported"
  And code "DOUBLE_BLINK" on engine "1.3.0" is "experimental"
  And code "BROW_RAISE" has no declaration on engine "1.3.0"
  And the station presents an edge.device token carrying "gest.capability.read"

Scenario Outline: Per-code support resolves to a detectable flag
  When the station runs support-check on engine "1.3.0" for code "<code>"
  Then the result for "<code>" has supportStatus "<status>"
  And the result for "<code>" has detectable <detectable>

  Examples:
    | code         | status       | detectable |
    | BLINK        | supported    | true       |
    | DOUBLE_BLINK | experimental | true       |
    | BROW_RAISE   | unknown      | false      |

Scenario: Bulk support-check returns every requested code, absent rows as unknown
  When the station runs support-check on engine "1.3.0" for codes "BLINK, DOUBLE_BLINK, BROW_RAISE"
  Then the response status is 200
  And the results contain exactly 3 entries
  And an ETag header is present

Scenario: Unknown engine version resolves all codes to unknown, not an error
  When the station runs support-check on engine "9.9.9" for codes "BLINK, DOUBLE_BLINK"
  Then the response status is 200
  And every result has supportStatus "unknown"
  And every result has detectable false

Scenario: Unchanged registry yields a conditional 304 for the cached station
  Given the station holds the current ETag for engine "1.3.0"
  When the station repeats support-check with If-None-Match set to that ETag
  Then the response status is 304
  And the response has no body

Scenario: Empty code set is rejected
  When the station runs support-check on engine "1.3.0" for codes ""
  Then the response status is 400
  And the problem type is "validation-error"

Scenario: support-check is served without calling PAT
  When the station runs support-check on engine "1.3.0" for codes "BLINK"
  Then no call is made to PAT gesture-types
