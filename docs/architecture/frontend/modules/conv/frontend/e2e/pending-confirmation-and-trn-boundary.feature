Feature: Pending-confirmation banner and the TRN authoring boundary
  As the CONV runtime
  I want to show the confirmation count and link out to TRN without authoring content
  So that CONV stays a read-only runtime and never exposes publish, retire or erase
  Covers: SPEC-03 (banner when confirmed phrases await), SPEC-01 (no confirm-training route, exactly one
          route, no publish/retire/erase route), SPEC-05 (no publish/retire/erase affordance, permission
          map limited to the three patient-session authorities)

  Background:
    Given a patient on /patient/converse with a cached speech-tree bundle

  Scenario: Caregiver-confirmed phrases awaiting patient confirmation show the link-out banner
    Given the cached snapshot has caregiver-confirmed phrases awaiting patient confirmation
    When the converse surface renders
    Then the system shows the N-phrases-to-confirm banner
    And the banner links to the TRN confirmation surface

  Scenario: The confirm-training surface is a link-out, not a CONV route
    When the module route table is inspected
    Then the system registers no /patient/confirm-training route
    And the system renders only a link-out banner to the TRN patient-confirmation surface

  Scenario: CONV registers exactly one route and no publish, retire or erase route
    When the module route table is inspected
    Then the system registers exactly one CONV route at /patient/converse
    And the system exposes no publish, retire or erase route

  Scenario: The CONV UI exposes no publish, retire or erase affordance
    When the converse surface renders
    Then the system exposes no publish, retire or erase affordance because those operations are TRN service-client only

  Scenario: The permission map holds only the three patient-session authorities
    When the CONV permission map is built
    Then the system builds the permission map only from conv.tree.read, conv.audio.read and conv.usage.record
    And the system introduces no publish, retire or erase UI authority
