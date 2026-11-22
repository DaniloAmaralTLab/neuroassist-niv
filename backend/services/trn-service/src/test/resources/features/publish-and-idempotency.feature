Feature: Synthesize, index and publish an approved proposal
# SPEC-05, SPEC-10, SPEC-11. One approval equals one publication (INV-TRN-6); ES non-blocking (ADR-006).

Background:
  Given a caregiver authenticated for tenant t_alpha
  And an approved phrase proposal pr-1 for patient p-100 with approval ap-1
  And a granted voice-cloning consent for patient p-100

Scenario: Publish pushes an immutable version to CONV
  When the caregiver requests publication of proposal pr-1
  Then the response status is 202
  And CONV received a publish with idempotencyKey trn:publish:ap-1
  And the publish body carries sourceVersionRef trn:approval:ap-1
  And the publication records the convVersionId returned by CONV
  And HIST received a ContentPublished audit fact

Scenario: Republish of the same approval is idempotent
  Given approval ap-1 has already been published
  When the caregiver requests publication of proposal pr-1 again
  Then no duplicate publication is created
  And no duplicate publish is sent to CONV

Scenario: Publication is refused for a non-approved proposal
  Given a proposed phrase proposal pr-2 for patient p-100
  When the caregiver requests publication of proposal pr-2
  Then the response status is 409
  And the problem type is not-approved

Scenario: Elasticsearch down does not block the publish
  Given Elasticsearch is unavailable
  When the caregiver requests publication of proposal pr-1
  Then the index job is retried
  And the publish to CONV still proceeds

Scenario: CONV down retries the publish without affecting runtime
  Given CONV is unavailable
  When the caregiver requests publication of proposal pr-1
  Then the publish job is retried idempotently
  And the approval ap-1 is retained
  And CONV runtime is not affected

Scenario Outline: Only approved proposals can be published
  Given a proposal pr-x for patient p-100 in state <state>
  When the caregiver requests publication of proposal pr-x
  Then publication is allowed only when <state> is approved

  Examples:
    | state              |
    | draft              |
    | proposed           |
    | caregiver_approved |
    | approved           |
