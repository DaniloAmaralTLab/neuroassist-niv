Feature: Register caregiver
  As a clinic coordinator in the active tenant
  I want to register a caregiver
  So that a second caregiver can access the patient's care unit

  Background:
    Given a signed-in caregiver with authority "acs.caregiver.create"
    And the active tenant is resolved from the session

  Scenario: Register caregiver sends username password and role and appends the new caregiver row
    Given the caregiver opens the register caregiver form
    When the caregiver submits username, password and role
    Then the system sends the register request with username, password and role and does not drop any required field
    And the new caregiver appears in the list after the server confirms

  Scenario: Duplicate username shows a field error on the username input not a global toast
    Given the caregiver opens the register caregiver form
    When the backend responds username-taken
    Then the system shows a field error on the username input
    And the system does not show a global toast

  Scenario: Validation error maps each field detail to its form field
    Given the caregiver opens the register caregiver form
    When the backend responds validation-error with field detail
    Then the system maps each field detail to its form field

  Scenario: Hide register caregiver action when the session lacks create authority and canRegister is false
    Given a signed-in caregiver without authority "acs.caregiver.create"
    When the caregiver opens the caregivers surface
    Then the system hides the register caregiver action
