Feature: Open and read a training session
# SPEC-01, SPEC-02; hub-integration §3 (PAT), §4 (HIST). Caregiver token only.

Background:
  Given a caregiver authenticated for tenant t_alpha
  And a patient p-100 exists in PAT for tenant t_alpha

Scenario: Open a session for a known patient
  When the caregiver opens a training session for patient p-100
  Then the response status is 201
  And the session status is open
  And HIST received a TrainingSessionStarted audit fact

Scenario: Open a session for an unknown patient
  Given patient p-404 does not resolve in PAT for tenant t_alpha
  When the caregiver opens a training session for patient p-404
  Then the response status is 404
  And the problem type is patient-not-found
  And no session is created

Scenario: Patient-session token is rejected on the authoring surface
  Given a patient-session token with authorities conv and gest only
  When that token opens a training session for patient p-100
  Then the response status is 403

Scenario: Audit failure rolls back session creation
  Given HIST is unavailable
  When the caregiver opens a training session for patient p-100
  Then the response status is 502
  And the problem type is audit-unavailable
  And no session is created

Scenario: Tenant header is ignored
  Given the request carries header X-Tenant-Id of t_other
  When the caregiver opens a training session for patient p-100
  Then the session is created in tenant t_alpha
