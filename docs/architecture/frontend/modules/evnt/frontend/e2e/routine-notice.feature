Feature: Discreet routine notice
  As a family caregiver
  I want routine requests to be noticed without alarming the household
  So that I can attend to non-emergency requests without a full-screen takeover

  Background:
    Given a signed-in caregiver with authority "evnt.event.read"
    And the caregiver is linked to a patient of the active tenant

  Scenario: When the projection reports a routine event the system presents a discreet notice and does not promote it to the alarm
    Given the projection reports a routine event for the patient
    When the caregiver views the Home notice slot
    Then the system presents it as a discreet routine notice
    And the system does not promote it to the full-screen alarm

  Scenario: While an event urgency is not readable as emergency the system presents it as a routine notice
    Given the projection reports an event whose urgency is not readable as emergency
    When the caregiver views the Home notice slot
    Then the system presents it as a routine notice
    And the system does not promote it to an alarm

  Scenario: When the caregiver dismisses a routine notice the system marks it seen locally
    Given a routine notice is shown in the Home notice slot
    When the caregiver dismisses the routine notice
    Then the system marks it seen locally
    And the system does not re-pop it within the session

  Scenario: When the caregiver marks a notice not real the system sends the false-positive verdict under the record authority
    Given the caregiver has authority "evnt.event.record"
    And a routine notice is shown
    When the caregiver marks the notice not real
    Then the system sends the false-positive verdict to the feedback endpoint
    And the system uses the authority "evnt.event.record" and not the superseded "evnt.event.feedback" key

  Scenario: While the session lacks record authority the system hides the mark-not-real action
    Given the caregiver does not have authority "evnt.event.record"
    And a routine notice is shown
    When the caregiver views the routine notice
    Then the system hides the mark-not-real action
