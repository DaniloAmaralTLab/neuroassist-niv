Feature: Voice-cloning consent gate
  As a caregiver
  I want consent of the patient and the legal representative captured before any synthesis
  So that no voice is cloned or published without a granted consent
  Covers: SPEC-07 (422 incomplete-consent, 409 consent-required)

  Background:
    Given a caregiver with a valid caregiver session carrying the trn consent authorities

  Scenario: Capturing consent without both the patient and the representative is refused as incomplete-consent
    Given a consent capture missing the representative half
    When POST /trn/consents responds 422 incomplete-consent
    Then the system shows the consent gate requiring both the patient and the representative
    And the system marks consent not granted

  Scenario: Requesting publication without granted consent is blocked and routes to the consent-capture gate
    Given an approved proposal for a patient with no granted consent
    When POST /trn/proposals/{proposalId}/publication responds 409 consent-required
    Then the system blocks the publish
    And the system routes to the consent-capture gate
    And the system calls no synthesis

  Scenario: Revoking voice consent stops a future synthesis for the patient
    Given a granted voice-cloning consent for the patient
    When the caregiver revokes the consent
    Then the system records the revocation
    And the system stops a future synthesis for the patient
