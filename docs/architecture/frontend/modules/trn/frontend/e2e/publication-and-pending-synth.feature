Feature: Publication lifecycle and pending-synth
  As a caregiver
  I want publication to be server-authoritative and never faked
  So that a node is shown published only after a service-confirmed synthesis
  Covers: SPEC-04 (publication poll, not optimistic), SPEC-03 (pending-synth),
          SPEC-07 (409 not-approved, pending-synth)

  Background:
    Given a caregiver with a valid caregiver session carrying trn.publication.create

  Scenario: Requesting publication of an approved proposal polls the publication status without an optimistic published
    Given an approved proposal with granted consent
    When the caregiver requests publication and POST /trn/proposals/{proposalId}/publication responds 202 pending
    Then the system polls the publication status
    And the system marks the node published optimistically in no case

  Scenario: Publishing a not-approved proposal is refused with the not-dual-authorized banner
    Given a proposal that is not yet approved
    When POST /trn/proposals/{proposalId}/publication responds 409 not-approved
    Then the system shows the not-dual-authorized banner
    And the system starts no publication

  Scenario: A publication pending synthesis is surfaced as pending-synth and never shown as published
    Given a publication whose synthesis is delayed on an ElevenLabs outage
    When the system reads the publication status pending
    Then the system surfaces the pending-synth state
    And the system shows the node as published in no case without a service-confirmed synthesis
