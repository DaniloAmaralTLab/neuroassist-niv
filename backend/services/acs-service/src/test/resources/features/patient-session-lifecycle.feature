# Covers SPEC-02 (core orchestration), SPEC-05 (idempotency) and SPEC-06: anchor action
# PatientSessionProvisioned and its terminal counterpart PatientSessionRevoked (ADR-012, ADR-003).
Feature: Patient session lifecycle (provision and revoke)

Background:
  Given a tenant "Familia Silva" has been onboarded
  And an active caregiver "ana.silva" with authority "acs.patient-session.provision" exists
  And the caregiver is authenticated with a valid token
  And a patient "patient-1" and a device "device-1" exist in the same tenant

Scenario: Provisioning a non-expiring least-authority session
  When the caregiver provisions a session for "patient-1" on "device-1"
  Then the response status is 201
  And the session status is "active"
  And the session token authorities are only "conv.*" and "gest.*"
  And the session token has no expiry claim
  And the session records provisionedBy as "ana.silva"
  And a "PatientSessionProvisioned" action is audited to HIST

Scenario: Revoking a session is immediate
  Given an active session for "patient-1" on "device-1" has been provisioned
  When the caregiver revokes that session
  Then the response status is 204
  And the session status is "revoked"
  And the session token jti is on the blacklist
  And the next request bearing that session token is rejected with 401
  And a "PatientSessionRevoked" action is audited to HIST

Scenario: Revoking an already-revoked session is idempotent
  Given an active session for "patient-1" on "device-1" has been provisioned and revoked
  When the caregiver revokes that session again
  Then the response status is 204
  And no second blacklist entry is created
  And no second "PatientSessionRevoked" action is audited

Scenario: A revoked session cannot be reactivated
  Given an active session for "patient-1" on "device-1" has been provisioned and revoked
  When the caregiver attempts to reactivate that session
  Then the attempt is rejected
  And re-enabling access requires provisioning a new session

Scenario: A patient session never carries management authority
  Given an active session for "patient-1" on "device-1" has been provisioned
  When the session token is used against "POST /acs/patient-sessions"
  Then the response status is 403
