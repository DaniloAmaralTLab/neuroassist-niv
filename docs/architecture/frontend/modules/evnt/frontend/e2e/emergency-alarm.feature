Feature: Full-screen emergency alarm and acknowledgement
  As a family caregiver
  I want an unmissable emergency alarm that I explicitly acknowledge
  So that I never miss a help request and I record that I attended to the patient

  Background:
    Given a signed-in caregiver with authority "evnt.event.read"
    And the caregiver is linked to a patient of the active tenant

  Scenario: When the live projection reports an active emergency the system takes over the screen
    Given the active-alarm projection reports an unconfirmed emergency for the patient
    When the caregiver dashboard reads the projection
    Then the system takes over the screen with the full-screen alarm
    And the system renders the active emergency with the resolved patient name, command label and detection time

  Scenario: When the caregiver acknowledges the system awaits the confirmation response before clearing the takeover
    Given the caregiver has authority "evnt.event.confirm"
    And an active emergency is rendered on the takeover
    When the caregiver acknowledges the emergency
    Then the system awaits the confirmation response before clearing the takeover
    And the system shows the transient acknowledged confirmation
    And the system returns to the no-active-emergency state on the next read cycle

  Scenario: If the confirmation write fails the system keeps the alarm active
    Given the caregiver has authority "evnt.event.confirm"
    And an active emergency is rendered on the takeover
    When the caregiver acknowledges the emergency and the confirmation write fails
    Then the system keeps the alarm active
    And the system offers a retry
    And the system does not render the alarm as acknowledged

  Scenario: The system renders the calm no-active-emergency state only after a successful read
    Given the active-alarm read succeeds and returns no active alarm
    When the caregiver opens the alarm surface
    Then the system renders the calm no-active-emergency state

  Scenario: While the session lacks confirm authority the system sets canConfirm false and hides the acknowledge action
    Given the caregiver does not have authority "evnt.event.confirm"
    And an active emergency is rendered on the takeover
    When the caregiver views the takeover
    Then the system sets the AlarmVM canConfirm capability false
    And the system hides the acknowledge action
    And the system still renders the alarm under the read authority

  Scenario: If the backend responds not-confirmable on a confirm the system shows a toast and does not change the alarm state
    Given the caregiver has authority "evnt.event.confirm"
    And the event being confirmed is a routine event
    When the caregiver attempts to acknowledge it
    Then the system shows a toast that only emergencies can be acknowledged
    And the system does not change the alarm state
