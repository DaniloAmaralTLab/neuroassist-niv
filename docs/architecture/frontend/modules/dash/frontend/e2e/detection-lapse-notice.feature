Feature: Online but not detecting notice
  As a caregiver
  I want a distinct notice when the camera is connected but the engine stopped seeing the patient
  So that connectivity is never mistaken for watching
  Covers: SPEC-07 (detection-lapse notice, never emergency), SPEC-04 (INT-DASH-1 open-lapse read)

  Background:
    Given a caregiver on the home overview with a linked patient

  Scenario: Online but not detecting shows an amber notice, never emergency
    Given EDGE connectivity is online
    And an EVNT detection lapse is open
    When the composite status is derived
    Then the system shows an online-but-not-detecting notice in amber
    And the headline resolves to notice
    And the headline does not show all clear
    And the system raises no emergency

  Scenario: Missing evnt.detection-lapse.read keeps the not-detecting source unknown and blocks all clear
    Given the session lacks the authority "evnt.detection-lapse.read"
    And every other overview source is ok and fresh
    When the caregiver opens the home overview
    Then the not-detecting source is shown as unknown
    And the overview is not reported as all clear
