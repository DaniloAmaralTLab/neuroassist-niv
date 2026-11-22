Feature: Partial failure and honest error handling
  As a caregiver
  I want a failed panel to show an honest error while the rest keeps working
  So that a single failure never blanks the screen or implies safety
  Covers: SPEC-07 (error → degrade, device error not offline/blank, HIST error em-dash, partial failure, observability)

  Background:
    Given a caregiver on the home overview with a linked patient

  Scenario: A composed source error degrades the headline with a reason
    Given a composed source errors or times out
    When the composite status is derived
    Then the composite headline is degraded with a plain-language reason
    And the headline does not show all clear

  Scenario: A failed device read shows an error panel, not offline or blank
    Given the EDGE device read fails
    When the device panel renders
    Then the device panel shows an error state
    And the device panel does not show offline
    And the device panel is not a blank card

  Scenario: A failed history summary shows an em dash, not zero events
    Given the HIST summary read fails
    When the day KPIs render
    Then the day KPIs show an em dash
    And the KPIs do not render zero events

  Scenario: Partial failure keeps the healthy panels rendered
    Given one panel has failed and the other panels are healthy
    When the home overview renders
    Then the healthy panels stay rendered
    And only the failed panel shows its error state

  Scenario: Composed-read failures report via the correlation id with no PII
    Given a composed read fails
    When the failure is reported
    Then the failure is reported through the shared observability correlation id
    And no raw patient PII is placed in telemetry
