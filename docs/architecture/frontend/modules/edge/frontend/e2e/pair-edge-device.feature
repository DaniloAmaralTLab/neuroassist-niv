Feature: Pair the edge device during onboarding
  As a technical lead / clinic coordinator
  I want to pair a patient's edge detector during setup
  So that the dashboard can confirm the detector is paired and operational

  Background:
    Given a signed-in coordinator with authority "edge.device.pair"
    And a patient of the active tenant with no paired edge device

  Scenario: When the coordinator begins pairing the system enrolls the device and displays the pairing code once
    When the coordinator begins pairing the edge device
    Then the system sends the enroll request to create the device
    And the system displays the pairing code and its expiry once

  Scenario: While the device is awaiting claim the system polls the device read and marks it paired only when the read returns paired
    Given the coordinator has begun pairing and the device is awaiting claim
    When the station claims the pairing code
    Then the system polls the device read
    And the system marks the device paired only when the read returns lifecycleState paired

  Scenario: Keep pairing pessimistic so the paired confirmation appears only after the server read confirms
    Given the coordinator has begun pairing and the device is awaiting claim
    When the server read has not yet returned paired
    Then the system does not mark the device paired before the server read confirms it

  Scenario: While a patient already has a paired device the system shows the existing device and offers no second pair
    Given the patient already has a paired edge device
    When the coordinator opens the pairing panel
    Then the system shows the existing device
    And the system does not offer a second pair action

  Scenario: If the station never claims the pairing code before it expires the system sets the pairing state to error with retry guidance
    Given the coordinator has begun pairing and the device is awaiting claim
    When the pairing code expires before the station claims it
    Then the system sets the pairing state to error with retry guidance
    And the system does not leave a paired device record

  Scenario: The dashboard does not call the device pairing claim endpoint
    When the coordinator begins pairing the edge device
    Then the system does not call the device pairing claim endpoint from the dashboard

  Scenario: Hide the pair device action when the session lacks pair authority
    Given a signed-in caregiver without authority "edge.device.pair"
    When the caregiver opens the pairing panel
    Then the system hides the pair device action
