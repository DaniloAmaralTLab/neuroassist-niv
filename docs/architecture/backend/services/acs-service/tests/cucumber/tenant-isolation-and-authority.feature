# Covers SPEC-06 (security), SPEC-03 (links) and the tenant-isolation invariants (INV-1, INV-5).
Feature: Tenant isolation, links and authority enforcement

Background:
  Given a tenant "Familia Silva" and a tenant "Clinica Norte" have been onboarded
  And an active caregiver "ana.silva" exists in "Familia Silva"
  And an active caregiver "rui.norte" exists in "Clinica Norte"

Scenario: Only platform-ops may onboard a tenant
  Given "ana.silva" is authenticated as a caregiver
  When "ana.silva" calls "POST /acs/ops/tenants"
  Then the response status is 403

Scenario: platform-ops onboards a tenant and triggers schema provisioning
  Given the "platform-ops" service client is authenticated
  When "platform-ops" onboards a tenant "Clinica Sul" of type "clinic"
  Then the response status is 201
  And a schema "t_<newTenantId>" is provisioned via MIG
  And a "TenantOnboarded" action is audited to HIST

Scenario: A caregiver cannot act on a caregiver of another tenant
  Given "ana.silva" is authenticated with authority "acs.caregiver.deactivate"
  When "ana.silva" deactivates caregiver "rui.norte"
  Then the response status is 404

Scenario: Linking a patient to a caregiver of the same tenant
  Given "ana.silva" is authenticated with authority "acs.patient-link.link"
  And a patient "patient-1" exists in "Familia Silva"
  When "ana.silva" links "patient-1" to herself
  Then the response status is 201
  And a "PatientLinked" action is audited to HIST

Scenario: A duplicate link is rejected
  Given "ana.silva" is authenticated with authority "acs.patient-link.link"
  And "patient-1" is already linked to "ana.silva"
  When "ana.silva" links "patient-1" to herself again
  Then the response status is 409
  And the ProblemDetail type is "link-exists"

Scenario Outline: Authority enforcement on management endpoints
  Given "ana.silva" is authenticated with authorities "<held>"
  When she calls "<verb> <endpoint>"
  Then the response status is <status>

  Examples:
    | held                          | verb   | endpoint                         | status |
    | acs.caregiver.create          | POST   | /acs/caregivers                  | 201    |
    | acs.patient-session.provision | POST   | /acs/caregivers                  | 403    |
    | acs.patient-session.revoke    | DELETE | /acs/patient-sessions/{id}       | 204    |
