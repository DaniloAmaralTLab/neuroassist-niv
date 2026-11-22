Feature: Edge device lifecycle
  As a clinic coordinator
  I want to unpair, deactivate, reactivate or revoke a patient's edge device
  So that I can manage the detector safely without affecting the patient or their session

  Background:
    Given a signed-in coordinator with authority "edge.device.unpair"
    And a patient of the active tenant with a paired edge device

  Scenario: When the caregiver confirms an unpair the system sends the unpair request and awaits the server before removing the device
    When the caregiver confirms the unpair
    Then the system sends the unpair request and awaits the server response
    And the system removes the device only after the server confirms

  Scenario: When the caregiver confirms a revoke the system sends the revoke request and awaits the server before marking the device revoked
    Given the coordinator also has authority "edge.device.revoke"
    When the caregiver confirms the revoke
    Then the system sends the revoke request and awaits the server response
    And the system marks the device revoked only after the server confirms

  Scenario: While a device is revoked the system hides the reactivate action
    Given the device has been revoked
    When the caregiver views the device lifecycle actions
    Then the system hides the reactivate action

  Scenario: If a reactivate targets a revoked device the system shows a modal that a revoked device requires a new enroll and pair
    Given the device is revoked
    When the backend responds device-revoked on a reactivate
    Then the system shows a modal explaining a revoked device requires a new enroll and pair

  Scenario: Disable the unpair action when the session lacks unpair authority
    Given a signed-in caregiver without authority "edge.device.unpair"
    When the caregiver views the device lifecycle actions
    Then the system disables the unpair action on the device

  Scenario: Disable the revoke action when the session lacks revoke authority
    Given a signed-in caregiver without authority "edge.device.revoke"
    When the caregiver views the device lifecycle actions
    Then the system disables the revoke action on the device

  Scenario: If the backend responds forbidden the system shows a toast and does not reveal whether the device exists
    When the backend responds forbidden on a lifecycle action
    Then the system shows a toast
    And the system does not reveal whether the target device exists

  Scenario: If the backend responds not-found the system shows a toast and does not remove the device optimistically
    When the backend responds not-found on a lifecycle action
    Then the system shows a toast
    And the system does not remove the device optimistically

  Scenario: The system evaluates every EDGE action through AccessDecisionService can authority and does not evaluate a role inline in a component
    When the caregiver triggers an EDGE action
    Then the system evaluates the EDGE action through AccessDecisionService can authority
    And the system does not evaluate a role inline in a component

  Scenario: The system treats the edge.device identity token as a device identity and not as a caregiver authority
    Given a station presents its edge.device identity token
    When a dashboard guard inspects the edge.device identity token
    Then the system treats the edge.device identity token as a device identity
    And the system does not treat the edge.device identity token as a caregiver authority in any dashboard guard
