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

# G-HIST-1 — structured commandLabel + urgency on event entries
Scenario: Event entries carry the structured command label and urgency
  Given an "EventGenerated" fact for patient "pat-1" with command label "Water" and urgency "emergency"
  When the caregiver gets "/hist/patients/pat-1/history"
  Then the response status is 200
  And the event entry exposes commandLabel "Water" and urgency "emergency"

# G-HIST-2 — join key + confirmation fold onto the originating event
Scenario: Confirmation is folded onto its originating event by the join key
  Given an "EventGenerated" and a sibling "AlarmConfirmed" for the same event of patient "pat-1"
  When the caregiver gets "/hist/patients/pat-1/history"
  Then the event entry carries relatedEventId equal to its subjectId
  And the event entry folds a confirmation with confirmedAt and confirmedBy

# G-HIST-3 — structured channel + masked target on escalation entries
Scenario: Escalation entries expose a structured channel and a masked target
  Given an "EscalationAttempted" fact for patient "pat-1" over channel "sms"
  When the caregiver gets "/hist/patients/pat-1/history"
  Then the escalation entry exposes channel "sms" and a masked target
  And the masked target is never a raw contact endpoint

# G-HIST-4 — whole-period summary on the first page only
Scenario: The first page carries a whole-period summary
  When the caregiver gets "/hist/patients/pat-1/history"
  Then the response carries a summary with scope "period"
  And the summary counts span the whole requested period

Scenario: Paginated pages omit the period summary
  When the caregiver gets "/hist/patients/pat-1/history" with a keyset cursor
  Then the response status is 200
  And the response carries no summary object
