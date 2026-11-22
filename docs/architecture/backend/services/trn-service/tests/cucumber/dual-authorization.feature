Feature: Dual authorization of a proposal
# SPEC-03; ADR-002. Both halves, distinct actors (INV-TRN-1). Anchor event ProposalApproved.

Background:
  Given a caregiver authenticated for tenant t_alpha
  And a proposed phrase proposal pr-1 for patient p-100

Scenario: Both halves by distinct actors reaches approved
  Given the caregiver half of proposal pr-1 is confirmed by caregiver cg-1
  When the patient assent for pr-1 is recorded by patient p-100 via gesture
  Then proposal pr-1 is in state approved
  And HIST received a ProposalApproved audit fact

Scenario: Single actor cannot supply both halves
  Given the caregiver half of proposal pr-1 is confirmed by caregiver cg-1
  When the patient assent for pr-1 is recorded by caregiver cg-1 via touch
  Then the response status is 409
  And the problem type is dual-authorization-same-actor
  And proposal pr-1 is not in state approved

Scenario: Guardian substitutes for a non-verbal patient
  Given the caregiver half of proposal pr-1 is confirmed by caregiver cg-1
  When the patient assent for pr-1 is recorded by guardian gd-1 via guardian_signature with relationship legal-guardian
  Then proposal pr-1 is in state approved
  And the assent records relationship legal-guardian and an evidence reference

Scenario: Only one half keeps the proposal below the gate
  When the caregiver half of proposal pr-1 is confirmed by caregiver cg-1
  Then proposal pr-1 is in state caregiver_approved
  And synthesis for pr-1 is not permitted

Scenario: Patient assent is never a trn authority on a patient-session token
  Given a patient-session token with authorities conv and gest only
  When that token records a patient assent for pr-1
  Then the response status is 403

Scenario Outline: Assent methods are accepted as domain facts
  Given the caregiver half of proposal pr-1 is confirmed by caregiver cg-1
  When the patient assent for pr-1 is recorded by patient p-100 via <method>
  Then proposal pr-1 is in state approved

  Examples:
    | method              |
    | gesture             |
    | touch               |
    | guardian_signature  |
