Feature: Provision a patient session
  As a caregiver
  I want to turn the patient's phone on as an operable device
  So that the patient can communicate through the runtime

  Background:
    Given a signed-in caregiver with authority "acs.patient-session.provision"
    And a patient of the active tenant with no active session

  Scenario: Confirm the persistent-session warning then provision the patient phone sending patientId and deviceId
    Given the caregiver opens the patient sessions surface
    When the caregiver confirms the persistent session warning
    And the caregiver provisions the patient phone
    Then the system sends patientId and deviceId to provision the session
    And an active session appears only after the server confirms the provision

  Scenario: While a patient session is active the system displays active since and never a countdown
    Given the patient has an active session
    When the caregiver views the active session row
    Then the system displays active since for the session
    And the system does not display any expiry countdown

  Scenario: Hide the provision action when the session lacks provision authority
    Given a signed-in caregiver without authority "acs.patient-session.provision"
    When the caregiver opens the patient sessions surface
    Then the system hides the provision action
