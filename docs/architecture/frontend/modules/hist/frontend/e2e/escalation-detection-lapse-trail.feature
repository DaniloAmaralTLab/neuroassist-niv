Feature: Escalation and detection-lapse trail on the history page
  As a family caregiver
  I want to see how the system tried to reach me and when detection lapsed
  So that I understand why I was or was not reached, calmly and after the fact

  Background:
    Given a signed-in caregiver with authority "hist.history.read"
    And the caregiver is linked to a patient of the active tenant
    And the feature flag "hist.escalation-trail" is on

  Scenario: The escalation and detection-lapse trail is a section of the history page served by hist.history.read
    When the caregiver opens the escalation and detection-lapse trail section
    Then the system renders the escalation attempts and detection-lapse entries from the same history read under authority "hist.history.read"
    And the system does not gate the trail section behind the operator authority "hist.audit.read"
    And the system issues no additional backend call for the trail section

  Scenario: Escalation and detection-lapse entries are shown as informational and never as an active emergency
    Given the history read returns escalation and detection-lapse entries
    When the caregiver views the trail section
    Then the system renders every escalation and detection-lapse entry as a visually distinct informational safety surface
    And the system does not style a detection-lapse or escalation entry as an active emergency

  Scenario: Escalation masked targets are rendered exactly as the backend masked them
    Given the history read returns an escalation entry with a masked target
    When the caregiver views the escalation entry
    Then the system renders the escalation masked target exactly as the backend masked it
    And the system does not unmask or reconstruct a phone or email

  Scenario: If the trail section fails the timeline still renders and the trail is flagged degraded
    Given the event timeline read succeeds
    When the escalation and detection-lapse section read fails
    Then the system renders the timeline
    And the system flags the escalation and detection-lapse trail section as degraded
    And the system does not imply there were no escalations
