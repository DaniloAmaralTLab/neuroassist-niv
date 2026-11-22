# Covers SPEC-01 (read surface), SPEC-03 (timeline), SPEC-06 (scope), INV-HIST-6
Feature: Caregiver patient-scoped history read

Background:
  Given hist-service is running
  And a caregiver "cg-1" in tenant "t-1" is linked to patient "pat-1"
  And the caregiver is authenticated with authority "hist.history.read"
  And the audit trail contains events for patient "pat-1" today

Scenario: Caregiver reads the timeline of a linked patient
  When the caregiver gets "/hist/patients/pat-1/history"
  Then the response status is 200
  And the entries are ordered newest-first
  And the window defaults to period "today"

Scenario: Caregiver cannot read a patient they are not linked to
  Given patient "pat-9" exists in tenant "t-1" and is not linked to caregiver "cg-1"
  When the caregiver gets "/hist/patients/pat-9/history"
  Then the response status is 403
  And no audit record is returned

Scenario: History read is strictly read-only
  When the caregiver sends "POST" to "/hist/patients/pat-1/history"
  Then the response status is 405

Scenario: Explicit range requires both bounds
  When the caregiver gets "/hist/patients/pat-1/history" with query "from=2026-11-01T00:00:00Z"
  Then the response status is 400

Scenario Outline: Period filter selects the right window
  When the caregiver gets "/hist/patients/pat-1/history" with period "<period>"
  Then the response status is 200
  And the window label is "<period>"

  Examples:
    | period |
    | today  |
    | week   |
    | month  |
