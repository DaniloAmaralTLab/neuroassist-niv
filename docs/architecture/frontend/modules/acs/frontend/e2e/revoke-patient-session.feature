Feature: Revoke a patient session
  As a caregiver
  I want to revoke the patient's phone session immediately
  So that a lost or compromised phone loses access at once (SEC-001)

  Background:
    Given a signed-in caregiver with authority "acs.patient-session.revoke"
    And a patient of the active tenant with an active session

  Scenario: While canRevoke is true the system renders the revoke action in the session row and not behind advanced settings
    When the caregiver views the active sessions list
    Then the system renders the revoke action in the session row
    And the system does not place the revoke action behind advanced settings

  Scenario: When the caregiver confirms a revoke the system sends the delete request and awaits the server before marking the row revoked
    When the caregiver confirms the revoke
    Then the system sends the revoke delete request and awaits the server response
    And the system marks the session row revoked only after the server confirms

  Scenario: While a session is revoked the system displays the revoked badge with revokedAt and revokedBy
    Given the session has been revoked
    When the caregiver views the session row
    Then the system displays the revoked badge with revokedAt and revokedBy

  Scenario: When a revoke targets an already-revoked session the system treats the 204 as success and confirms the revoked state
    Given the session is already revoked
    When the caregiver confirms the revoke
    Then the system treats the response as success
    And the system confirms the current revoked state with a toast

  Scenario: Optimistic revoke rollback restores the prior active status when the server rejects the revoke
    Given the revoke is configured optimistic
    When the caregiver confirms the revoke and the server rejects it
    Then the system restores the prior active status
    And the system surfaces the error

  Scenario: Disable the revoke action on every session row when the session lacks revoke authority
    Given a signed-in caregiver without authority "acs.patient-session.revoke"
    When the caregiver views the active sessions list
    Then the system disables the revoke action on every session row
