# Covers SPEC-03 (safety) + api-contract §3.1/§4.1. INV-EVNT-3/5, ADR-003, ADR-010.
Feature: Alarm delivery via polling

Background:
  Given a caregiver token for "care-1" in tenant "t-1" linked to patient "pat-1"

Scenario: A committed emergency is the active alarm on the next poll
  Given an emergency event "e-1" for patient "pat-1" exists unconfirmed
  When the caregiver polls the active alarm for patient "pat-1"
  Then the response status is 200
  And the activeAlarm id is "e-1"
  And the response advertises pollIntervalSeconds 3
  And the response includes serverTime

Scenario: No active alarm returns an empty envelope
  Given patient "pat-1" has no unconfirmed emergency
  When the caregiver polls the active alarm for patient "pat-1"
  Then the response status is 200
  And activeAlarm is null

Scenario: An unconfirmed emergency persists across polls
  Given an emergency event "e-2" for patient "pat-1" exists unconfirmed
  When the caregiver polls the active alarm for patient "pat-1" twice
  Then both responses return activeAlarm id "e-2"

Scenario: Confirming the emergency clears it on the next poll
  Given an emergency event "e-3" for patient "pat-1" exists unconfirmed
  When the caregiver confirms event "e-3"
  And the caregiver polls the active alarm for patient "pat-1"
  Then the confirm response status is 200
  And an "AlarmConfirmed" audit is recorded
  And activeAlarm is null

Scenario: Confirming an already-confirmed emergency is idempotent
  Given an emergency event "e-4" for patient "pat-1" is already confirmed by "care-1"
  When the caregiver confirms event "e-4"
  Then the response status is 200
  And no second "AlarmConfirmed" audit is recorded

Scenario: A routine event cannot be confirmed
  Given a routine event "e-5" for patient "pat-1" exists
  When the caregiver confirms event "e-5"
  Then the response status is 409
  And the problem type is "not-confirmable"
