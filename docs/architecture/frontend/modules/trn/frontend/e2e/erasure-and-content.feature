Feature: Erasure and governance facts
  As a caregiver
  I want erasure gated by authority and governance facts recorded honestly
  So that the right-to-be-forgotten and the audit trail are both respected
  Covers: SPEC-05 (hide erase without trn.content.delete), SPEC-07 (502 audit-unavailable)

  Background:
    Given a caregiver with a valid caregiver session

  Scenario: Lacking trn.content.delete hides the erase affordance
    Given the caregiver session lacks trn.content.delete
    When the training surface renders the proposal actions
    Then the system hides the erase affordance

  Scenario: A hard-502 audit-unavailable shows the governance-fact banner and is not persisted
    Given a caregiver confirmation on a hard-502 audited path
    When the call responds 502 audit-unavailable
    Then the system shows the governance-fact banner
    And the system treats the action as not persisted

  Scenario: Erasing a patient's voice content requests the content deletion and surfaces the retired counts
    Given a caregiver with trn.content.delete confirming the erase modal
    When DELETE /trn/patients/{patientId}/content responds 202 with the erased and retired counts
    Then the system requests the content deletion
    And the system surfaces the retired counts
