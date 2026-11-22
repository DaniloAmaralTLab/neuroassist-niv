Feature: Patient registration and lifecycle

# Covers SPEC-01, SPEC-02; invariants INV-PAT-1, INV-PAT-2.
# Tenant is always taken from the JWT tenantId claim, never from the body or X-Tenant-Id.

Background:
  Given a caregiver authenticated with a tenant-scoped ACS JWT for tenant "T1"
  And the caregiver holds authority "pat.patient.create"

Scenario: Register a patient in the caller's tenant
  When the caregiver registers a patient with label "Dona Maria"
  Then the response status is 201
  And the created patient has status "active"
  And the created patient tenantId equals the JWT tenantId "T1"
  And a "PatientRegistered" action is audited to HIST within the same request

Scenario: X-Tenant-Id header is ignored
  When the caregiver registers a patient with label "Seu Jose" and header "X-Tenant-Id" set to "T2"
  Then the response status is 201
  And the created patient tenantId equals the JWT tenantId "T1"

Scenario: Register a patient without a paired device
  When the caregiver registers a patient with label "Dona Clara" and no deviceId
  Then the response status is 201
  And the created patient deviceId is null

Scenario: Reading a patient of another tenant is not disclosed
  Given a patient "P9" exists in tenant "T2"
  When the caregiver requests patient "P9"
  Then the response status is 404

Scenario: Deactivate and reactivate a patient
  Given a patient "P1" with status "active" in tenant "T1"
  And the caregiver holds authority "pat.patient.deactivate"
  And the caregiver holds authority "pat.patient.activate"
  When the caregiver deactivates patient "P1"
  Then the response status is 204
  And patient "P1" has status "inactive"
  And a "PatientDeactivated" action is audited to HIST
  When the caregiver reactivates patient "P1"
  Then the response status is 200
  And patient "P1" has status "active"
  And a "PatientReactivated" action is audited to HIST

Scenario: A patient-session token cannot reach PAT
  Given a request bearing a patient-session token with authorities "conv.read, gest.read" only
  When it calls any "/pat/patients" endpoint
  Then the response status is 403
