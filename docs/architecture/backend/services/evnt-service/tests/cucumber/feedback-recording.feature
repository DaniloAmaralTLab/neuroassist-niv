# Covers api-contract §5.1 + SPEC-05. Feedback axis independent of confirmation.
Feature: Feedback recording

Background:
  Given a caregiver token for "care-1" in tenant "t-1" linked to patient "pat-1"
  And an event "e-10" for patient "pat-1" with feedback "not_evaluated"

Scenario Outline: Recording a verdict sets the feedback and audits once
  When the caregiver records feedback "<verdict>" on event "e-10"
  Then the response status is 200
  And the event feedback is "<verdict>"
  And a "FeedbackRecorded" audit is recorded

  Examples:
    | verdict        |
    | real           |
    | false_positive |

Scenario: Re-recording the same verdict is idempotent
  Given event "e-10" already has feedback "real"
  When the caregiver records feedback "real" on event "e-10"
  Then the response status is 200
  And no second "FeedbackRecorded" audit is recorded

Scenario: A changed verdict overwrites and audits once
  Given event "e-10" already has feedback "real"
  When the caregiver records feedback "false_positive" on event "e-10"
  Then the response status is 200
  And the event feedback is "false_positive"
  And a "FeedbackRecorded" audit is recorded

Scenario: An invalid verdict is rejected
  When the caregiver records feedback "maybe" on event "e-10"
  Then the response status is 400
  And the problem type is "validation-error"
