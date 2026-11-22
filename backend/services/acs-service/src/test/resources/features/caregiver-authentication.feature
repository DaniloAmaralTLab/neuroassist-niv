# Covers SPEC-01 (API surface) and SPEC-06 (security): login, tenant resolution, deactivation gate.
Feature: Caregiver authentication and tenant-scoped JWT issuance

Background:
  Given a tenant "Familia Silva" of type "family" has been onboarded
  And an active caregiver "ana.silva" with role "caregiver" exists in that tenant

Scenario: Successful login issues a tenant-scoped caregiver token
  When "ana.silva" authenticates with a valid password
  Then the response status is 200
  And the response contains an access token with actorType "caregiver"
  And the token carries the tenantId of "Familia Silva"
  And a "CaregiverAuthenticated" action is audited to HIST

Scenario: Invalid credentials are rejected without user enumeration
  When "ana.silva" authenticates with a wrong password
  Then the response status is 401
  And the ProblemDetail type is "invalid-credentials"

Scenario: A deactivated caregiver cannot log in
  Given the caregiver "ana.silva" has been deactivated
  When "ana.silva" authenticates with a valid password
  Then the response status is 401
  And the ProblemDetail type is "invalid-credentials"

Scenario: Login resolves deterministically to exactly one tenant
  Given a second tenant "Clinica Norte" of type "clinic" has been onboarded
  When "ana.silva" authenticates with a valid password
  Then the issued token carries the tenantId of "Familia Silva"
  And it does not carry the tenantId of "Clinica Norte"

Scenario Outline: Role determines the issued authority set
  Given an active caregiver "<user>" with role "<role>" exists in that tenant
  When "<user>" authenticates with a valid password
  Then the token authorities include "<includes>"
  And the token authorities exclude "<excludes>"

  Examples:
    | user        | role               | includes                       | excludes                 |
    | ana.silva   | caregiver          | acs.patient-session.provision  | acs.caregiver.create     |
    | bia.coord   | clinic_coordinator | acs.caregiver.create           | acs.tenant.onboard       |
