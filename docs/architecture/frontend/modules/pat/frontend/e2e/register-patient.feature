Feature: Register patient
  As a technical lead during onboarding
  I want to register the patient
  So that the caregiver can start building the command catalog

  Background:
    Given a signed-in caregiver with authority "pat.patient.create"
    And the active tenant is resolved from the session

  Scenario: Register a patient with a name and advance the onboarding wizard to the first command step
    Given the caregiver opens the register patient form
    When the caregiver enters a patient name and submits
    Then the system sends the register request with the patient name, derives the tenant from the session, and advances the onboarding wizard to the first-command step after the server confirms

  Scenario: Keep submit disabled while the patient name is blank
    Given the caregiver opens the register patient form
    When the patient name is blank
    Then the system keeps the submit control disabled and does not send the request
