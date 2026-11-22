Feature: Dual-authorization assent gate
  As a caregiver attesting the patient/guardian assent in session
  I want the patient half recorded as a distinct-actor domain fact
  So that a node is approved only when both halves agree, under the caregiver authority
  Covers: SPEC-01 (render the assent surface), SPEC-03 (pending caregiver-approved filter),
          SPEC-04 (optimistic + 409 re-read), SPEC-07 (same-actor, proposal-state-locked)

  Background:
    Given a caregiver with a valid caregiver session carrying trn.proposal.approve

  Scenario: Navigating to training assent renders the assisted patient-assent surface
    When the caregiver navigates to /training/assent
    Then the system renders the assisted patient-assent surface
    And the surface offers large targets and a switch-scan channel

  Scenario: The patient-assent pending list holds only caregiver-approved proposals
    Given proposals in several lifecycle states
    When the assent surface builds the pending list
    Then the pending list holds only proposals in the caregiver-approved state
    And the system offers no proposal that is not yet caregiver-approved or already approved

  Scenario: A patient assent by the same actor as the caregiver is refused with the distinct-actor banner
    Given a proposal whose caregiver half was recorded by the signed-in caregiver
    When the caregiver records a patient assent with the same actor
    And POST /trn/proposals/{proposalId}/patient-assent responds 409 dual-authorization-same-actor
    Then the system shows the distinct-actor banner
    And the system records no assent

  Scenario: An optimistic confirmation reconciles on a proposal-state-locked conflict by re-reading server truth
    Given a proposal confirmed optimistically in the dual-confirm indicator
    When the confirmation responds 409 proposal-state-locked
    Then the system re-reads the server truth
    And the system reconciles the indicator and keeps no stale optimistic state
